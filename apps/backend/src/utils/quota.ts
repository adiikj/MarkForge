import type { Request } from "express";
import { ApiError } from "./ApiError.js";
import { prisma } from "../db/index.js";

// Daily limits on repo drafts. Signed-out visitors are counted per IP in memory; signed-in
// users per account in Postgres (so the limit follows them across devices).

export type QuotaKind = "generate";

const ANON_LIMIT = Number(process.env.FREE_GENERATIONS_PER_DAY ?? 3);
const ACCOUNT_LIMITS = {
  FREE: Number(process.env.FREE_ACCOUNT_GENERATIONS_PER_DAY ?? 5),
  PRO: Number.POSITIVE_INFINITY,
  TEAM: Number.POSITIVE_INFINITY,
} as const;

export interface QuotaStatus {
  /** null = unlimited */
  limit: number | null;
  used: number;
  /** null = unlimited */
  remaining: number | null;
  /** ISO timestamp of the next UTC midnight. */
  resetsAt: string;
  scope: "anonymous" | "account";
}

const today = () => new Date().toISOString().slice(0, 10);
const nextReset = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
};

const anonUsage = new Map<string, number>();
let anonDay = "";
const rollover = () => {
  if (today() !== anonDay) {
    anonUsage.clear();
    anonDay = today();
  }
};
const anonKey = (req: Request, kind: QuotaKind) => `${kind}:${req.ip ?? "unknown"}`;

const status = (limit: number, used: number, scope: QuotaStatus["scope"]): QuotaStatus => ({
  limit: Number.isFinite(limit) ? limit : null,
  used,
  remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : null,
  resetsAt: nextReset(),
  scope,
});

export const getQuota = async (req: Request, kind: QuotaKind): Promise<QuotaStatus> => {
  if (req.user) {
    const row = await prisma.usageDay.findUnique({ where: { userId_day_kind: { userId: req.user.id, day: today(), kind } } });
    return status(ACCOUNT_LIMITS[req.user.plan], row?.count ?? 0, "account");
  }
  rollover();
  return status(ANON_LIMIT, anonUsage.get(anonKey(req, kind)) ?? 0, "anonymous");
};

export const consumeQuota = async (req: Request, kind: QuotaKind): Promise<QuotaStatus> => {
  if (req.user) {
    await prisma.usageDay.upsert({
      where: { userId_day_kind: { userId: req.user.id, day: today(), kind } },
      create: { userId: req.user.id, day: today(), kind, count: 1 },
      update: { count: { increment: 1 } },
    });
  } else {
    rollover();
    const key = anonKey(req, kind);
    anonUsage.set(key, (anonUsage.get(key) ?? 0) + 1);
  }
  return getQuota(req, kind);
};

/** Throws 429 QUOTA_EXCEEDED when the daily allowance is used up. */
export const assertQuota = async (req: Request, kind: QuotaKind): Promise<void> => {
  const q = await getQuota(req, kind);
  if (q.remaining !== null && q.remaining <= 0) {
    const hint = q.scope === "anonymous" ? " Sign up free for more." : "";
    throw new ApiError(429, `You've used all ${q.limit} free repo drafts for today.${hint}`, [{ code: "QUOTA_EXCEEDED", ...q }]);
  }
};
