import type { CookieOptions, Response } from "express";
import { ACCESS_TTL_SECONDS, REFRESH_TTL_MS } from "./tokens.js";

export const ACCESS_COOKIE = "mf_at";
export const REFRESH_COOKIE = "mf_rt";
export const OAUTH_STATE_COOKIE = "mf_oauth";

const secure = () => process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";

// Lax: sent on same-site requests and top-level navigations only, which blocks cross-site
// POSTs from carrying the session. The Next.js app proxies /api, so these are first-party.
const base = (): CookieOptions => ({ httpOnly: true, sameSite: "lax", secure: secure(), path: "/" });

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base(), maxAge: ACCESS_TTL_SECONDS * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base(), maxAge: REFRESH_TTL_MS });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE, base());
  res.clearCookie(REFRESH_COOKIE, base());
};

export const setOAuthStateCookie = (res: Response, value: string) =>
  res.cookie(OAUTH_STATE_COOKIE, value, { ...base(), maxAge: 10 * 60 * 1000 });

export const clearOAuthStateCookie = (res: Response) => res.clearCookie(OAUTH_STATE_COOKIE, base());
