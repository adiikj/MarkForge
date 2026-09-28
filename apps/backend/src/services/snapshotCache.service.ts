import { ApiError } from "../utils/ApiError.js";
import { getRepoSnapshot, parseRepoUrl, type RepoSnapshot } from "./github.service.js";

// Short-lived cache so "check → generate → docs pack" on one repo costs a single GitHub round-trip.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 100;
const snapshotCache = new Map<string, { at: number; snapshot: RepoSnapshot }>();

export const loadSnapshot = async (repoInput: unknown): Promise<RepoSnapshot> => {
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

export const repoSummary = (snapshot: RepoSnapshot) => ({
  fullName: snapshot.meta.fullName,
  htmlUrl: snapshot.meta.htmlUrl,
  description: snapshot.meta.description,
  stars: snapshot.meta.stars,
  defaultBranch: snapshot.meta.defaultBranch,
});
