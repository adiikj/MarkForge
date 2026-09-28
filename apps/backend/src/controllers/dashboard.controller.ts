import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validate } from "../utils/validate.js";
import { getQuota } from "../utils/quota.js";
import { loadSnapshot, repoSummary } from "../services/snapshotCache.service.js";
import { findReadme } from "../services/github.service.js";
import { analyzeRepo } from "../services/analyzer.service.js";
import { checkReadme } from "../services/healthCheck.service.js";
import { recordActivity } from "../services/activity.service.js";
import { ActivityType } from "../generated/prisma/enums.js";

const PLAN_LIMITS = {
  FREE: { documents: 25, repos: 10 },
  PRO: { documents: 1000, repos: 200 },
  TEAM: { documents: 5000, repos: 1000 },
} as const;

const MAX_DOC_CHARS = 200_000;
const DOC_KINDS = ["README", "PROFILE", "DOCS", "CHANGELOG", "OTHER"] as const;

// ---------------- Overview ----------------

/** GET /api/dashboard/overview */
export const overview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [documents, repos, activityWeek, recent, trendRows, recentDocs, quota] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.trackedRepo.findMany({ where: { userId }, select: { lastScore: true } }),
    prisma.activity.count({ where: { userId, createdAt: { gte: weekAgo } } }),
    prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.activity.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.document.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, title: true, kind: true, repo: true, updatedAt: true },
    }),
    getQuota(req, "generate"),
  ]);
  const scored = repos.filter((r) => r.lastScore !== null).map((r) => r.lastScore!);

  // Daily activity counts for the last 14 days (oldest first) for the sparkline.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const counts = new Map(days.map((d) => [d, 0]));
  for (const r of trendRows) {
    const d = r.createdAt.toISOString().slice(0, 10);
    if (counts.has(d)) counts.set(d, counts.get(d)! + 1);
  }

  res.json(
    new ApiResponse(200, "Overview", {
      stats: {
        documents,
        repos: repos.length,
        averageScore: scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
        activityThisWeek: activityWeek,
      },
      limits: PLAN_LIMITS[req.user!.plan],
      quota,
      trend: days.map((day) => ({ day, count: counts.get(day)! })),
      recentActivity: recent,
      recentDocuments: recentDocs,
    })
  );
});

// ---------------- Documents ----------------

const docInput = z.object({
  title: z.string().trim().min(1, "Give it a title.").max(120),
  content: z.string().max(MAX_DOC_CHARS, "That document is too large."),
  kind: z.enum(DOC_KINDS).optional(),
  repo: z.string().trim().max(140).nullable().optional(),
});

/** GET /api/documents?q= */
export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const documents = await prisma.document.findMany({
    where: {
      userId: req.user!.id,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { repo: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, kind: true, repo: true, createdAt: true, updatedAt: true, content: true },
  });
  // Send a short excerpt instead of whole documents in the list.
  res.json(
    new ApiResponse(200, "Documents", {
      documents: documents.map(({ content, ...d }) => ({ ...d, excerpt: content.replace(/[#>*`_\-\[\]!|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140), size: content.length })),
      limit: PLAN_LIMITS[req.user!.plan].documents,
    })
  );
});

const ownDocument = async (req: Request) => {
  const doc = await prisma.document.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!doc) throw new ApiError(404, "Document not found.");
  return doc;
};

/** GET /api/documents/:id */
export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  res.json(new ApiResponse(200, "Document", { document: await ownDocument(req) }));
});

/** POST /api/documents */
export const createDocument = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(docInput, req.body);
  const limit = PLAN_LIMITS[req.user!.plan].documents;
  if ((await prisma.document.count({ where: { userId: req.user!.id } })) >= limit) {
    throw new ApiError(403, `Free accounts can save up to ${limit} documents. Delete some or upgrade.`, [{ code: "LIMIT_REACHED" }]);
  }
  const document = await prisma.document.create({ data: { ...body, repo: body.repo ?? null, userId: req.user!.id } });
  recordActivity(req, "DOCUMENT_SAVED", document.repo, { title: document.title });
  res.status(201).json(new ApiResponse(201, "Saved", { document }));
});

/** PATCH /api/documents/:id */
export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  await ownDocument(req);
  const body = validate(docInput.partial(), req.body);
  const document = await prisma.document.update({ where: { id: String(req.params.id) }, data: body });
  res.json(new ApiResponse(200, "Saved", { document }));
});

/** DELETE /api/documents/:id */
export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await ownDocument(req);
  await prisma.document.delete({ where: { id: String(req.params.id) } });
  res.json(new ApiResponse(200, "Deleted", null));
});

// ---------------- Tracked repos ----------------

/** Runs a health check for a tracked repo and stores the result. Health checks are free (no quota). */
const runCheck = async (repoId: string, fullName: string) => {
  const snapshot = await loadSnapshot(fullName);
  const readme = findReadme(snapshot);
  const isProfileRepo = snapshot.meta.ownerType === "User" && snapshot.meta.name.toLowerCase() === snapshot.meta.owner.toLowerCase();
  const report = readme
    ? checkReadme(readme.content, {
        profile: analyzeRepo(snapshot),
        paths: snapshot.paths,
        baseDir: readme.path.includes("/") ? readme.path.slice(0, readme.path.lastIndexOf("/")) : "",
        kind: isProfileRepo ? "profile" : "project",
      })
    : null;
  const score = report?.score ?? 0;
  const grade = report?.grade ?? "F";
  const failing = report ? report.checks.filter((c) => c.status !== "pass").length : 1;
  const [repo] = await prisma.$transaction([
    prisma.trackedRepo.update({
      where: { id: repoId },
      data: { lastScore: score, lastGrade: grade, lastCheckedAt: new Date(), description: snapshot.meta.description, htmlUrl: snapshot.meta.htmlUrl },
    }),
    prisma.healthCheck.create({ data: { repoId, score, grade, failing } }),
  ]);
  return { repo, summary: repoSummary(snapshot), hasReadme: Boolean(readme) };
};

/** GET /api/repos — each with its last 12 scores for a trend line. */
export const listRepos = asyncHandler(async (req: Request, res: Response) => {
  const repos = await prisma.trackedRepo.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: { checks: { orderBy: { createdAt: "desc" }, take: 12, select: { score: true, createdAt: true } } },
  });
  res.json(
    new ApiResponse(200, "Repos", {
      repos: repos.map(({ checks, ...r }) => ({ ...r, history: checks.reverse() })),
      limit: PLAN_LIMITS[req.user!.plan].repos,
    })
  );
});

/** POST /api/repos { repo } — track and run the first check. */
export const trackRepo = asyncHandler(async (req: Request, res: Response) => {
  const { repo } = validate(z.object({ repo: z.string().trim().min(3).max(200) }), req.body);
  const limit = PLAN_LIMITS[req.user!.plan].repos;
  if ((await prisma.trackedRepo.count({ where: { userId: req.user!.id } })) >= limit) {
    throw new ApiError(403, `Free accounts can track up to ${limit} repos.`, [{ code: "LIMIT_REACHED" }]);
  }
  // Resolve the canonical name first (also validates the repo exists).
  const snapshot = await loadSnapshot(repo);
  const fullName = snapshot.meta.fullName;
  const existing = await prisma.trackedRepo.findUnique({ where: { userId_fullName: { userId: req.user!.id, fullName } } });
  if (existing) throw new ApiError(409, `You're already tracking ${fullName}.`);
  const created = await prisma.trackedRepo.create({
    data: { userId: req.user!.id, fullName, htmlUrl: snapshot.meta.htmlUrl, description: snapshot.meta.description },
  });
  const result = await runCheck(created.id, fullName);
  recordActivity(req, "REPO_TRACKED", fullName, { score: result.repo.lastScore });
  res.status(201).json(new ApiResponse(201, "Tracking", { repo: result.repo, hasReadme: result.hasReadme }));
});

/** POST /api/repos/:id/check */
export const recheckRepo = asyncHandler(async (req: Request, res: Response) => {
  const tracked = await prisma.trackedRepo.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!tracked) throw new ApiError(404, "Repo not found.");
  const result = await runCheck(tracked.id, tracked.fullName);
  recordActivity(req, "HEALTH_CHECK", tracked.fullName, { score: result.repo.lastScore, grade: result.repo.lastGrade });
  res.json(new ApiResponse(200, "Checked", { repo: result.repo, previousScore: tracked.lastScore }));
});

/** DELETE /api/repos/:id */
export const untrackRepo = asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.trackedRepo.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!count) throw new ApiError(404, "Repo not found.");
  res.json(new ApiResponse(200, "Stopped tracking", null));
});

// ---------------- Activity ----------------

/** GET /api/activity?cursor=<id>&type=<ActivityType> — newest first, 25 per page. */
export const listActivity = asyncHandler(async (req: Request, res: Response) => {
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const rawType = typeof req.query.type === "string" ? req.query.type : "";
  const type = (Object.values(ActivityType) as string[]).includes(rawType) ? (rawType as ActivityType) : undefined;
  const page = await prisma.activity.findMany({
    where: { userId: req.user!.id, ...(type ? { type } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 26,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  res.json(new ApiResponse(200, "Activity", { items: page.slice(0, 25), nextCursor: page.length > 25 ? page[24].id : null }));
});
