import type { Request, Response } from "express";
import { prisma } from "../db/index.js";
import type { User } from "../generated/prisma/client.js";
import type { TokenType } from "../generated/prisma/enums.js";
import { clearAuthCookies, setAuthCookies } from "../utils/cookies.js";
import { hashToken, randomToken, REFRESH_TTL_MS, signAccessToken } from "../utils/tokens.js";
import { ApiError } from "../utils/ApiError.js";

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** The only user shape that leaves the server. */
export const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  name: u.name,
  avatarUrl: u.avatarUrl,
  emailVerified: Boolean(u.emailVerifiedAt),
  hasPassword: Boolean(u.passwordHash),
  github: u.githubLogin ? { login: u.githubLogin } : null,
  plan: u.plan,
  createdAt: u.createdAt,
});
export type PublicUser = ReturnType<typeof publicUser>;

/** Starts a new device session and sets both cookies. */
export const startSession = async (req: Request, res: Response, userId: string) => {
  const refresh = randomToken();
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(refresh),
      userAgent: req.get("user-agent")?.slice(0, 300) ?? null,
      ip: req.ip ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  setAuthCookies(res, signAccessToken(userId, session.id), refresh);
  return session;
};

// Two tabs refreshing at the same moment both present the same token; tolerate that briefly.
const ROTATION_GRACE_MS = 20_000;

/**
 * Exchanges a refresh token for a new pair (rotation). If a token that was already rotated
 * away is presented again after the grace window, it may have been stolen, so the session is revoked.
 */
export const rotateSession = async (req: Request, res: Response, refresh: string) => {
  const hash = hashToken(refresh);
  const session = await prisma.session.findUnique({ where: { tokenHash: hash } });
  const expired = () => {
    clearAuthCookies(res);
    return new ApiError(401, "Your session has ended. Please log in again.", [{ code: "SESSION_EXPIRED" }]);
  };

  if (!session) {
    const reused = await prisma.session.findUnique({ where: { prevTokenHash: hash } });
    if (reused && !reused.revokedAt) {
      if (reused.rotatedAt && Date.now() - reused.rotatedAt.getTime() < ROTATION_GRACE_MS) {
        // Another tab already rotated; its new cookie is shared, so the caller can simply retry.
        throw new ApiError(409, "Session was just refreshed. Retry.", [{ code: "REFRESH_RACE" }]);
      }
      await revokeSession(reused.id);
      console.warn(`[auth] refresh token reuse detected; revoked session ${reused.id}`);
    }
    throw expired();
  }
  if (session.revokedAt || session.expiresAt < new Date()) throw expired();

  const next = randomToken();
  await prisma.session.update({
    where: { id: session.id },
    data: { tokenHash: hashToken(next), prevTokenHash: hash, rotatedAt: new Date(), lastUsedAt: new Date(), ip: req.ip ?? session.ip },
  });
  setAuthCookies(res, signAccessToken(session.userId, session.id), next);
  return session;
};

export const revokeSession = (sessionId: string) =>
  prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });

export const revokeAllSessions = (userId: string, exceptSessionId?: string) =>
  prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });

const TOKEN_TTL: Record<TokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/** Issues a single-use emailed token, invalidating earlier ones of the same type. */
export const issueAuthToken = async (userId: string, type: TokenType) => {
  const token = randomToken();
  await prisma.$transaction([
    prisma.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL[type]) },
    }),
  ]);
  return token;
};

/** Marks the token used and returns its user id, or throws if it's invalid/expired/used. */
export const consumeAuthToken = async (token: string, type: TokenType) => {
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) {
    throw new ApiError(400, "This link is invalid or has expired. Request a new one.", [{ code: "TOKEN_INVALID" }]);
  }
  // Conditional update so two concurrent requests can't both use the token.
  const { count } = await prisma.authToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!count) throw new ApiError(400, "This link has already been used.", [{ code: "TOKEN_INVALID" }]);
  return row.userId;
};
