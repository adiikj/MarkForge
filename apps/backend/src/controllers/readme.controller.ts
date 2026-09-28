import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { findReadme, getRepoSnapshot, parseRepoUrl, type RepoSnapshot } from "../services/github.service.js";
import { analyzeRepo } from "../services/analyzer.service.js";
import { generateReadme } from "../services/readmeGenerator.service.js";
import { checkReadme } from "../services/healthCheck.service.js";
import { consumeQuota, getQuota } from "../utils/quota.js";

const MAX_MARKDOWN_CHARS = 200_000;

// Short-lived cache so "check → generate → check again" on one repo costs a single GitHub round-trip.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 100;
const snapshotCache = new Map<string, { at: number; snapshot: RepoSnapshot }>();

const loadSnapshot = async (repoInput: unknown): Promise<RepoSnapshot> => {
  if (typeof repoInput !== "string" || !repoInput.trim()) {
    throw new ApiError(400, "Provide a repository link or owner/repo.");
  }
  const { owner, repo } = parseRepoUrl(repoInput);
  const key = `${owner}/${repo}`.toLowerCase();
  const hit = snapshotCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.snapshot;

  const snapshot = await getRepoSnapshot(owner, repo);
  if (snapshotCache.size >= CACHE_MAX) snapshotCache.delete(snapshotCache.keys().next().value!);
  snapshotCache.set(key, { at: Date.now(), snapshot });
  return snapshot;
};

const repoSummary = (snapshot: RepoSnapshot) => ({
  fullName: snapshot.meta.fullName,
  htmlUrl: snapshot.meta.htmlUrl,
  description: snapshot.meta.description,
  stars: snapshot.meta.stars,
  defaultBranch: snapshot.meta.defaultBranch,
});

/** GET /api/readme/quota */
export const quotaStatus = asyncHandler(async (req: Request, res: Response) => {
  return res.json(new ApiResponse(200, "Quota", { generate: getQuota(req, "generate") }));
});

/** POST /api/readme/generate  { repo } */
export const generateFromRepo = asyncHandler(async (req: Request, res: Response) => {
  const before = getQuota(req, "generate");
  if (before.remaining <= 0) {
    throw new ApiError(429, `You've used all ${before.limit} free repo READMEs for today.`, [
      { code: "QUOTA_EXCEEDED", ...before },
    ]);
  }

  const snapshot = await loadSnapshot(req.body?.repo);
  const profile = analyzeRepo(snapshot);
  const markdown = generateReadme(profile);
  // Only successful generations count against the free tier.
  const quota = consumeQuota(req, "generate");

  return res.json(
    new ApiResponse(200, "README generated", {
      repo: repoSummary(snapshot),
      markdown,
      detected: {
        ecosystem: profile.ecosystem,
        packageManager: profile.packageManager,
        stack: profile.stack,
        envVars: profile.envVars.length,
        scripts: profile.scripts.map((s) => s.name),
        isMonorepo: profile.isMonorepo,
      },
      hasExistingReadme: findReadme(snapshot) !== null,
      quota,
    })
  );
});

/**
 * POST /api/readme/health
 *   { repo }              check the repo's README
 *   { markdown, kind? }   check pasted Markdown
 *   { repo, markdown }    check edited Markdown against the repo (re-scoring after fixes)
 */
export const checkHealth = asyncHandler(async (req: Request, res: Response) => {
  const { repo, markdown, kind } = req.body ?? {};

  if (typeof markdown === "string") {
    if (!markdown.trim()) throw new ApiError(400, "Paste some Markdown to check.");
    if (markdown.length > MAX_MARKDOWN_CHARS) throw new ApiError(413, "That README is too large to check.");
  }

  if (typeof markdown === "string" && !repo) {
    const report = checkReadme(markdown, { kind: kind === "profile" ? "profile" : "project" });
    return res.json(new ApiResponse(200, "Checked", { source: "paste", report, markdown }));
  }

  const snapshot = await loadSnapshot(repo);
  const found = findReadme(snapshot);
  const readme = typeof markdown === "string" ? { path: found?.path ?? "README.md", content: markdown } : found;
  if (!readme) {
    return res.json(
      new ApiResponse(200, "No README", { source: "repo", repo: repoSummary(snapshot), report: null, markdown: null })
    );
  }

  const profile = analyzeRepo(snapshot);
  // github.com/<user>/<user> is a profile README; organizations don't have those.
  const isProfileRepo =
    snapshot.meta.ownerType === "User" && snapshot.meta.name.toLowerCase() === snapshot.meta.owner.toLowerCase();
  const report = checkReadme(readme.content, {
    profile,
    paths: snapshot.paths,
    baseDir: readme.path.includes("/") ? readme.path.slice(0, readme.path.lastIndexOf("/")) : "",
    kind: isProfileRepo ? "profile" : "project",
  });

  return res.json(
    new ApiResponse(200, "Checked", {
      source: "repo",
      repo: repoSummary(snapshot),
      readmePath: readme.path,
      report,
      markdown: readme.content,
    })
  );
});
