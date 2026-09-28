import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./ApiError.js";

/**
 * Small fixed-window limiter for sensitive endpoints (login, signup, reset).
 * In-memory: per process only; put a shared store (Redis) in front when running several instances.
 */
export const rateLimit = (opts: { windowMs: number; max: number; name: string }) => {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${opts.name}:${req.ip}`;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      return next();
    }
    entry.count++;
    if (entry.count > opts.max) {
      const wait = Math.ceil((entry.resetAt - now) / 1000);
      return next(new ApiError(429, `Too many attempts. Try again in ${wait} seconds.`, [{ code: "RATE_LIMITED", retryAfter: wait }]));
    }
    next();
  };
};
