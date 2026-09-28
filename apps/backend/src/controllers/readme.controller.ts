import type { Request, Response } from "express";
import { recordActivity } from "../services/activity.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { findReadme } from "../services/github.service.js";
import { loadSnapshot, repoSummary } from "../services/snapshotCache.service.js";
import { analyzeRepo } from "../services/analyzer.service.js";
import { generateReadme } from "../services/readmeGenerator.service.js";
import { checkReadme } from "../services/healthCheck.service.js";
import { assertQuota, consumeQuota, getQuota } from "../utils/quota.js";

const MAX_MARKDOWN_CHARS = 200_000;

/** GET /api/readme/quota */
export const quotaStatus = asyncHandler(async (req: Request, res: Response) => {
  return res.json(new ApiResponse(200, "Quota", { generate: await getQuota(req, "generate") }));
});

/** POST /api/readme/generate  { repo } */
export const generateFromRepo = asyncHandler(async (req: Request, res: Response) => {
  await assertQuota(req, "generate");

  const snapshot = await loadSnapshot(req.body?.repo);
  const profile = analyzeRepo(snapshot);
  const markdown = generateReadme(profile);
  // Only successful generations count against the free tier.
  const quota = await consumeQuota(req, "generate");
  recordActivity(req, "README_DRAFT", snapshot.meta.fullName, { ecosystem: profile.ecosystem });

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

  if (typeof markdown !== "string") recordActivity(req, "HEALTH_CHECK", snapshot.meta.fullName, { score: report.score, grade: report.grade });
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
