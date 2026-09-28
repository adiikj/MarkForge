import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let devSecretWarned = false;
const accessSecret = (): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("ACCESS_TOKEN_SECRET must be set in production.");
  if (!devSecretWarned) {
    console.warn("[auth] ACCESS_TOKEN_SECRET not set; using an insecure development secret.");
    devSecretWarned = true;
  }
  return "markforge-dev-only-secret";
};

export const signAccessToken = (userId: string, sessionId: string) =>
  jwt.sign({ sub: userId, sid: sessionId }, accessSecret(), { expiresIn: ACCESS_TTL_SECONDS });

export type AccessPayload = { sub: string; sid: string };

/** Returns the payload, "expired", or null for anything invalid. */
export const verifyAccessToken = (token: string): AccessPayload | "expired" | null => {
  try {
    const payload = jwt.verify(token, accessSecret()) as jwt.JwtPayload;
    return typeof payload.sub === "string" && typeof payload.sid === "string" ? { sub: payload.sub, sid: payload.sid } : null;
  } catch (err) {
    return err instanceof jwt.TokenExpiredError ? "expired" : null;
  }
};

/** URL-safe random token for refresh, verification and reset links. */
export const randomToken = () => randomBytes(32).toString("base64url");

/** Tokens are stored hashed so a database leak doesn't hand out live sessions or reset links. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
