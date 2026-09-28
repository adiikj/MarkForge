import type { Request, Response } from "express";
import { recordActivity } from "../services/activity.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { loadSnapshot, repoSummary } from "../services/snapshotCache.service.js";
import { analyzeRepo } from "../services/analyzer.service.js";
import { generateDocsPack } from "../services/docsPack.service.js";
import { getCommitRange, getRefs, parseRepoUrl } from "../services/github.service.js";
import { buildChangelog } from "../services/changelog.service.js";
import { architectureDiagram, structureDiagram } from "../services/diagram.service.js";
import { assertQuota, consumeQuota } from "../utils/quota.js";

/**
 * POST /api/tools/repo-profile  { repo }
 * What the badge builder and section blocks need to fill in repo-specific details. Free.
 */
export const repoProfile = asyncHandler(async (req: Request, res: Response) => {
  const snapshot = await loadSnapshot(req.body?.repo);
  const p = analyzeRepo(snapshot);
  return res.json(
    new ApiResponse(200, "Profile", {
      repo: repoSummary(snapshot),
      owner: p.meta.owner,
      name: p.meta.name,
      homepage: p.meta.homepage,
      license: p.meta.license,
      ecosystem: p.ecosystem,
      packageManager: p.packageManager,
      stack: p.stack,
      npmPackage: p.npmPackage,
      pypiPackage: p.pypiPackage,
      crateName: p.crateName,
      goModule: p.goModule,
      ciWorkflows: p.ciWorkflows,
      hasDocker: p.hasDocker,
      licensePath: p.licensePath,
      contributingPath: p.contributingPath,
      envVars: p.envVars,
    })
  );
});

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/;

/** POST /api/tools/docs-pack  { repo, contactEmail? }  Counts toward the daily repo-draft quota. */
export const docsPack = asyncHandler(async (req: Request, res: Response) => {
  const { repo, contactEmail } = req.body ?? {};
  if (contactEmail !== undefined && contactEmail !== "" && (typeof contactEmail !== "string" || !EMAIL_RE.test(contactEmail))) {
    throw new ApiError(400, "That contact email doesn't look valid.");
  }

  await assertQuota(req, "generate");

  const snapshot = await loadSnapshot(repo);
  const profile = analyzeRepo(snapshot);
  const files = generateDocsPack(profile, snapshot.paths, { contactEmail });
  const quota = await consumeQuota(req, "generate");
  recordActivity(req, "DOCS_PACK", snapshot.meta.fullName, { files: files.filter((f) => !f.exists).length });

  return res.json(new ApiResponse(200, "Docs pack generated", { repo: repoSummary(snapshot), files, quota }));
});

const REF_RE = /^[\w./-]{1,200}$/;

/** POST /api/tools/changelog/refs  { repo }  Tags and default branch for the range picker. Free. */
export const changelogRefs = asyncHandler(async (req: Request, res: Response) => {
  const repo = req.body?.repo;
  if (typeof repo !== "string" || !repo.trim()) throw new ApiError(400, "Provide a repository link or owner/repo.");
  const { owner, repo: name } = parseRepoUrl(repo);
  return res.json(new ApiResponse(200, "Refs", await getRefs(owner, name)));
});

/** POST /api/tools/changelog  { repo, from?, to }  Counts toward the daily repo-draft quota. */
export const changelog = asyncHandler(async (req: Request, res: Response) => {
  const { repo, from, to } = req.body ?? {};
  if (typeof repo !== "string" || !repo.trim()) throw new ApiError(400, "Provide a repository link or owner/repo.");
  if (typeof to !== "string" || !REF_RE.test(to)) throw new ApiError(400, "Pick a valid 'to' tag or branch.");
  if (from != null && from !== "" && (typeof from !== "string" || !REF_RE.test(from))) {
    throw new ApiError(400, "Pick a valid 'from' tag.");
  }
  await assertQuota(req, "generate");

  const { owner, repo: name } = parseRepoUrl(repo);
  const { commits, truncated } = await getCommitRange(owner, name, from || null, to);
  const entries = buildChangelog(commits);
  const quota = await consumeQuota(req, "generate");
  recordActivity(req, "CHANGELOG", `${owner}/${name}`, { from: from || null, to, entries: entries.length });
  return res.json(
    new ApiResponse(200, "Changelog", {
      repo: { fullName: `${owner}/${name}`, htmlUrl: `https://github.com/${owner}/${name}` },
      from: from || null,
      to,
      commitCount: commits.length,
      truncated,
      entries,
      quota,
    })
  );
});

/** POST /api/tools/diagram  { repo }  Architecture + folder-structure Mermaid. Counts toward the quota. */
export const repoDiagram = asyncHandler(async (req: Request, res: Response) => {
  await assertQuota(req, "generate");
  const snapshot = await loadSnapshot(req.body?.repo);
  const profile = analyzeRepo(snapshot);
  const result = {
    repo: repoSummary(snapshot),
    architecture: architectureDiagram(snapshot, profile),
    structure: structureDiagram(snapshot),
  };
  const quota = await consumeQuota(req, "generate");
  recordActivity(req, "DIAGRAM", snapshot.meta.fullName);
  return res.json(new ApiResponse(200, "Diagram", { ...result, quota }));
});
