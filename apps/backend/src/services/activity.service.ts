import type { Request } from "express";
import { prisma } from "../db/index.js";
import type { ActivityType } from "../generated/prisma/enums.js";
import type { Prisma } from "../generated/prisma/client.js";

/** Records what a signed-in user generated. Fire-and-forget: never fails the request. */
export const recordActivity = (req: Request, type: ActivityType, repo?: string | null, meta?: Prisma.InputJsonValue) => {
  if (!req.user) return;
  prisma.activity
    .create({ data: { userId: req.user.id, type, repo: repo ?? null, meta } })
    .catch((err) => console.error("[activity] failed to record:", err instanceof Error ? err.message : err));
};
