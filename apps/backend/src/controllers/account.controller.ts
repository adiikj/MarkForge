import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { passwordSchema, usernameSchema, validate } from "../utils/validate.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { clearAuthCookies } from "../utils/cookies.js";
import { publicUser, revokeAllSessions, revokeSession } from "../services/auth.service.js";

/** PATCH /api/account { name?, username? } */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(
    z.object({ name: z.string().trim().max(80).nullable().optional(), username: usernameSchema.optional() }),
    req.body
  );
  if (body.username && body.username !== req.user!.username) {
    const taken = await prisma.user.findUnique({ where: { username: body.username }, select: { id: true } });
    if (taken) throw new ApiError(409, "That username is taken.", [{ field: "username", message: "That username is taken." }]);
  }
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name: body.name === undefined ? undefined : body.name || null, username: body.username },
  });
  res.json(new ApiResponse(200, "Profile updated", { user: publicUser(user) }));
});

/** POST /api/account/password { currentPassword?, newPassword } — also lets GitHub-only accounts add one. */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(z.object({ currentPassword: z.string().optional(), newPassword: passwordSchema }), req.body);
  const user = req.user!;
  if (user.passwordHash) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new ApiError(400, "Your current password is incorrect.", [{ field: "currentPassword", message: "Incorrect password." }]);
    }
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
  // Keep this device signed in; sign out everything else.
  await revokeAllSessions(user.id, req.sessionId ?? undefined);
  res.json(new ApiResponse(200, user.passwordHash ? "Password changed. Other devices were signed out." : "Password set.", { user: publicUser(updated) }));
});

/** GET /api/account/sessions */
export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, userAgent: true, ip: true, createdAt: true, lastUsedAt: true },
  });
  res.json(new ApiResponse(200, "Sessions", { sessions: sessions.map((s) => ({ ...s, current: s.id === req.sessionId })) }));
});

/** DELETE /api/account/sessions/:id */
export const deleteSession = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const session = await prisma.session.findFirst({ where: { id, userId: req.user!.id } });
  if (!session) throw new ApiError(404, "Session not found.");
  await revokeSession(id);
  if (id === req.sessionId) clearAuthCookies(res);
  res.json(new ApiResponse(200, "Signed out that device.", null));
});

/** POST /api/account/sessions/revoke-others */
export const revokeOtherSessions = asyncHandler(async (req: Request, res: Response) => {
  const { count } = await revokeAllSessions(req.user!.id, req.sessionId ?? undefined);
  res.json(new ApiResponse(200, count ? `Signed out ${count} other device${count > 1 ? "s" : ""}.` : "No other devices were signed in.", null));
});

/** DELETE /api/account/github */
export const unlinkGithub = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user!.githubId) throw new ApiError(400, "No GitHub account is connected.");
  if (!req.user!.passwordHash) {
    throw new ApiError(400, "Set a password first, or you'd have no way to sign in.", [{ code: "NEEDS_PASSWORD" }]);
  }
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { githubId: null, githubLogin: null } });
  res.json(new ApiResponse(200, "GitHub disconnected.", { user: publicUser(user) }));
});

/** DELETE /api/account { confirm: <username> } — permanent; cascades to everything the user owns. */
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { confirm } = validate(z.object({ confirm: z.string() }), req.body);
  if (confirm.trim().toLowerCase() !== req.user!.username) {
    throw new ApiError(400, "Type your username exactly to confirm.", [{ field: "confirm", message: "Doesn't match your username." }]);
  }
  await prisma.user.delete({ where: { id: req.user!.id } });
  clearAuthCookies(res);
  res.json(new ApiResponse(200, "Your account has been deleted.", null));
});
