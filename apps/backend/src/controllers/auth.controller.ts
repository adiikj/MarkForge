import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { emailSchema, passwordSchema, usernameSchema, validate } from "../utils/validate.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { hashToken, randomToken } from "../utils/tokens.js";
import { clearAuthCookies, clearOAuthStateCookie, OAUTH_STATE_COOKIE, REFRESH_COOKIE, setOAuthStateCookie } from "../utils/cookies.js";
import {
  appUrl,
  consumeAuthToken,
  issueAuthToken,
  publicUser,
  revokeAllSessions,
  rotateSession,
  startSession,
} from "../services/auth.service.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/mailer.service.js";
import { fetchGithubProfile, githubAuthorizeUrl, githubOAuthEnabled } from "../services/github-oauth.service.js";
import { getQuota } from "../utils/quota.js";

// A real hash to compare against when the account doesn't exist, so response time doesn't reveal it.
const DUMMY_HASH = hashPassword("markforge-timing-equalizer");

const sendVerification = async (userId: string, email: string) => {
  const token = await issueAuthToken(userId, "EMAIL_VERIFY");
  await sendVerificationEmail(email, `${appUrl()}/verify-email?token=${token}`);
};

/** Only allow same-site relative paths as post-login destinations (no open redirects). */
const safeNext = (next: unknown) =>
  typeof next === "string" && /^\/(?!\/)[\w\-./?=&%#]*$/.test(next) ? next : "/dashboard";

/** GET /api/auth/providers — which sign-in options this server has configured. */
export const providers = asyncHandler(async (_req: Request, res: Response) => {
  res.json(new ApiResponse(200, "Providers", { password: true, github: githubOAuthEnabled() }));
});

/** POST /api/auth/signup { email, username, password, name? } */
export const signup = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(
    z.object({
      email: emailSchema,
      username: usernameSchema,
      password: passwordSchema,
      name: z.string().trim().max(80).optional(),
    }),
    req.body
  );
  const clash = await prisma.user.findFirst({
    where: { OR: [{ email: body.email }, { username: body.username }] },
    select: { email: true, username: true },
  });
  if (clash?.email === body.email) {
    throw new ApiError(409, "An account with this email already exists.", [{ field: "email", message: "Already registered. Try logging in." }]);
  }
  if (clash) throw new ApiError(409, "That username is taken.", [{ field: "username", message: "That username is taken." }]);

  const user = await prisma.user.create({
    data: { email: body.email, username: body.username, name: body.name || null, passwordHash: await hashPassword(body.password) },
  });
  await startSession(req, res, user.id);
  await sendVerification(user.id, user.email);
  res.status(201).json(new ApiResponse(201, "Account created", { user: publicUser(user) }));
});

/** POST /api/auth/login { identifier, password }  identifier = email or username */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(
    z.object({ identifier: z.string().trim().toLowerCase().min(1, "Enter your email or username."), password: z.string().min(1, "Enter your password.") }),
    req.body
  );
  const user = await prisma.user.findFirst({ where: { OR: [{ email: body.identifier }, { username: body.identifier }] } });
  const ok = await verifyPassword(body.password, user?.passwordHash ?? (await DUMMY_HASH));
  if (!user || !user.passwordHash || !ok) {
    throw new ApiError(401, "Incorrect email/username or password.", [{ code: "INVALID_CREDENTIALS" }]);
  }
  await startSession(req, res, user.id);
  res.json(new ApiResponse(200, "Logged in", { user: publicUser(user) }));
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refresh = req.cookies?.[REFRESH_COOKIE];
  if (refresh) {
    await prisma.session.updateMany({ where: { tokenHash: hashToken(refresh), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  clearAuthCookies(res);
  res.json(new ApiResponse(200, "Logged out", null));
});

/** POST /api/auth/refresh — rotates the refresh token and issues a new access token. */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, "Please log in to continue.", [{ code: "UNAUTHENTICATED" }]);
  const session = await rotateSession(req, res, token);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  res.json(new ApiResponse(200, "Refreshed", { user: publicUser(user) }));
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json(new ApiResponse(200, "Me", { user: publicUser(req.user!), quota: await getQuota(req, "generate") }));
});

/** POST /api/auth/verify-email { token } */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = validate(z.object({ token: z.string().min(10) }), req.body);
  const userId = await consumeAuthToken(token, "EMAIL_VERIFY");
  const user = await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  res.json(new ApiResponse(200, "Email verified", { user: publicUser(user) }));
});

/** POST /api/auth/resend-verification */
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.emailVerifiedAt) return res.json(new ApiResponse(200, "Your email is already verified.", null));
  await sendVerification(user.id, user.email);
  res.json(new ApiResponse(200, `We sent a new link to ${user.email}.`, null));
});

/** POST /api/auth/forgot-password { email } — always 200 so it can't be used to find accounts. */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = validate(z.object({ email: emailSchema }), req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET");
    await sendPasswordResetEmail(user.email, `${appUrl()}/reset-password?token=${token}`);
  }
  res.json(new ApiResponse(200, "If an account exists for that email, a reset link is on its way.", null));
});

/** POST /api/auth/reset-password { token, password } — signs out everywhere, then in here. */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(z.object({ token: z.string().min(10), password: passwordSchema }), req.body);
  const userId = await consumeAuthToken(body.token, "PASSWORD_RESET");
  // Getting the reset email proves ownership of the address, so mark it verified too.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(body.password), emailVerifiedAt: new Date() },
  });
  await revokeAllSessions(user.id);
  await startSession(req, res, user.id);
  res.json(new ApiResponse(200, "Password updated", { user: publicUser(user) }));
});

// ---------------- GitHub OAuth ----------------

/** GET /api/auth/github?next=/dashboard  (also used from Settings to link an account) */
export const githubStart = asyncHandler(async (req: Request, res: Response) => {
  if (!githubOAuthEnabled()) return res.redirect(`${appUrl()}/login?error=github_disabled`);
  const state = randomToken();
  setOAuthStateCookie(res, JSON.stringify({ state, next: safeNext(req.query.next) }));
  res.redirect(githubAuthorizeUrl(state));
});

const uniqueUsername = async (base: string) => {
  const clean = base.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^[-_]+|[-_]+$/g, "").slice(0, 26) || "user";
  const padded = clean.length >= 3 ? clean : `${clean}-dev`;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? padded : `${padded}-${i + 1}`;
    if (!(await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } }))) return candidate;
  }
  return `${padded}-${randomToken().slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
};

/** GET /api/auth/github/callback?code&state */
export const githubCallback = asyncHandler(async (req: Request, res: Response) => {
  const fail = (reason: string) => res.redirect(`${appUrl()}/login?error=${reason}`);
  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(req.cookies?.[OAUTH_STATE_COOKIE] ?? "{}");
  } catch {
    /* treated as missing */
  }
  clearOAuthStateCookie(res);
  const { code, state, error } = req.query as Record<string, string | undefined>;
  if (error) return fail("github_denied");
  if (!code || !state || !saved.state || state !== saved.state) return fail("github_state");

  let gh;
  try {
    gh = await fetchGithubProfile(code);
  } catch (err) {
    console.error("[auth] GitHub OAuth failed:", err instanceof Error ? err.message : err);
    return fail("github_failed");
  }
  const githubFields = { githubId: gh.id, githubLogin: gh.login };
  const next = safeNext(saved.next);

  // 1) Signed in already: link GitHub to this account (from Settings).
  if (req.user) {
    const owner = await prisma.user.findUnique({ where: { githubId: gh.id }, select: { id: true } });
    if (owner && owner.id !== req.user.id) return res.redirect(`${appUrl()}/dashboard/settings?error=github_in_use`);
    await prisma.user.update({ where: { id: req.user.id }, data: { ...githubFields, avatarUrl: req.user.avatarUrl ?? gh.avatarUrl } });
    return res.redirect(`${appUrl()}/dashboard/settings?linked=github`);
  }

  // 2) Returning GitHub user.
  let user = await prisma.user.findUnique({ where: { githubId: gh.id } });
  // 3) Existing email account with the same *verified* GitHub email: link them.
  if (!user && gh.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: gh.email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { ...githubFields, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(), avatarUrl: byEmail.avatarUrl ?? gh.avatarUrl },
      });
    }
  }
  // 4) New account.
  if (!user) {
    if (!gh.email) return fail("github_no_email");
    user = await prisma.user.create({
      data: {
        ...githubFields,
        email: gh.email,
        username: await uniqueUsername(gh.login),
        name: gh.name,
        avatarUrl: gh.avatarUrl,
        emailVerifiedAt: new Date(),
      },
    });
  }
  await startSession(req, res, user.id);
  res.redirect(`${appUrl()}${next}`);
});
