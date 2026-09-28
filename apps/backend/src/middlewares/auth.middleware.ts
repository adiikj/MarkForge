import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/index.js";
import type { User } from "../generated/prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { ACCESS_COOKIE } from "../utils/cookies.js";
import { verifyAccessToken } from "../utils/tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User | null;
      sessionId?: string | null;
      /** Set when the access token was present but expired, so requireAuth can say so. */
      authExpired?: boolean;
    }
  }
}

/**
 * Runs on every request: attaches req.user when a valid access token is present.
 * Never rejects; routes that need a user add requireAuth.
 */
export const attachUser = async (req: Request, _res: Response, next: NextFunction) => {
  req.user = null;
  req.sessionId = null;
  const token = req.cookies?.[ACCESS_COOKIE] || req.get("authorization")?.replace(/^Bearer /i, "");
  if (!token || !process.env.DATABASE_URL) return next();

  const payload = verifyAccessToken(token);
  if (payload === "expired") {
    req.authExpired = true;
    return next();
  }
  if (!payload) return next();
  try {
    // Checking the session makes logout / "sign out other devices" take effect immediately.
    const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (session && !session.revokedAt && session.userId === payload.sub) {
      req.user = session.user;
      req.sessionId = session.id;
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user) return next();
  next(
    req.authExpired
      ? new ApiError(401, "Your session expired.", [{ code: "TOKEN_EXPIRED" }])
      : new ApiError(401, "Please log in to continue.", [{ code: "UNAUTHENTICATED" }])
  );
};
