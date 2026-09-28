import type { Request } from "express";

// Free-tier usage limits, counted per client IP per UTC day.
// In-memory: resets on restart and isn't shared across instances. Move to MongoDB/Redis
// (keyed by user id once accounts exist) before relying on it for billing.

export const FREE_LIMITS = {
  generate: Number(process.env.FREE_GENERATIONS_PER_DAY ?? 3),
} as const;

export type QuotaKind = keyof typeof FREE_LIMITS;

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  /** ISO timestamp of the next UTC midnight. */
  resetsAt: string;
}

const usage = new Map<string, number>();
let usageDay = "";

const today = () => new Date().toISOString().slice(0, 10);

const nextReset = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
};

// Drop yesterday's counters so the map can't grow without bound.
const rollover = () => {
  const day = today();
  if (day !== usageDay) {
    usage.clear();
    usageDay = day;
  }
};

const clientKey = (req: Request, kind: QuotaKind) => `${kind}:${req.ip ?? "unknown"}`;

export const getQuota = (req: Request, kind: QuotaKind): QuotaStatus => {
  rollover();
  const limit = FREE_LIMITS[kind];
  const used = usage.get(clientKey(req, kind)) ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used), resetsAt: nextReset() };
};

export const consumeQuota = (req: Request, kind: QuotaKind): QuotaStatus => {
  rollover();
  const key = clientKey(req, kind);
  usage.set(key, (usage.get(key) ?? 0) + 1);
  return getQuota(req, kind);
};
