import { posix } from "node:path";
import axios, { AxiosError } from "axios";
import { ApiError } from "../utils/ApiError.js";

// Files whose contents feed the analyzers. Matched against root-level paths only;
// anything nested is still visible through the tree listing.
const KEY_FILES = [
  "package.json",
  ".env.example",
  ".env.sample",
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
  "go.mod",
  "Cargo.toml",
  "composer.json",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "Dockerfile",
  "docker-compose.yml",
  "compose.yml",
  "pnpm-workspace.yaml",
];

const MAX_FILE_BYTES = 200_000;
const MAX_NESTED_MANIFESTS = 8;

export interface RepoMeta {
  owner: string;
  ownerType: "User" | "Organization";
  name: string;
  fullName: string;
  description: string | null;
  homepage: string | null;
  defaultBranch: string;
  language: string | null;
  license: { spdxId: string; name: string } | null;
  topics: string[];
  stars: number;
  forks: number;
  isFork: boolean;
  htmlUrl: string;
}

export interface RepoSnapshot {
  meta: RepoMeta;
  /** Every file path in the default branch. */
  paths: string[];
  /** Contents of KEY_FILES found at the repo root, plus nested package.json files (keyed by path). */
  files: Record<string, string>;
  /** The README GitHub displays on the repo page, if any. */
  readmePath: string | null;
  /** True when GitHub truncated the tree (very large repos). */
  truncated: boolean;
}

/** Accepts "owner/repo", "github.com/owner/repo", full URLs, ".git" suffixes, and deep links. */
export const parseRepoUrl = (input: string): { owner: string; repo: string } => {
  const cleaned = input
    .trim()
    .replace(/^git@github\.com:/, "")
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, "")
    .replace(/\.git$/, "");
  const [owner, repo] = cleaned.split(/[/?#]/);
  const valid = /^[A-Za-z0-9-]{1,39}$/.test(owner ?? "") && /^[A-Za-z0-9._-]{1,100}$/.test(repo ?? "");
  if (!valid) {
    throw new ApiError(400, "That doesn't look like a GitHub repository. Try owner/repo or a github.com link.");
  }
  return { owner, repo };
};

const github = axios.create({
  baseURL: "https://api.github.com",
  timeout: 15_000,
  headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
});

github.interceptors.request.use((config) => {
  if (process.env.GITHUB_TOKEN) {
    config.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return config;
});

const toApiError = (error: unknown, fullName: string): ApiError => {
  if (error instanceof ApiError) return error;
  const err = error as AxiosError<{ message?: string }>;
  const status = err.response?.status;
  if (status === 404) return new ApiError(404, `Repository ${fullName} was not found or is private.`);
  if (status === 403 || status === 429) {
    const reset = err.response?.headers?.["x-ratelimit-reset"];
    const when = reset ? ` Try again after ${new Date(Number(reset) * 1000).toLocaleTimeString("en-US")}.` : "";
    return new ApiError(429, `GitHub rate limit reached.${when}`);
  }
  return new ApiError(502, `GitHub request failed: ${err.response?.data?.message ?? err.message}`);
};

const fetchRaw = async (owner: string, repo: string, branch: string, path: string): Promise<string | null> => {
  try {
    const { data } = await axios.get<string>(
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`,
      { responseType: "text", timeout: 15_000, maxContentLength: MAX_FILE_BYTES, transformResponse: (d) => d }
    );
    return data;
  } catch {
    return null;
  }
};

export const getRepoSnapshot = async (owner: string, repo: string): Promise<RepoSnapshot> => {
  const fullName = `${owner}/${repo}`;
  try {
    const { data: r } = await github.get(`/repos/${owner}/${repo}`);
    const meta: RepoMeta = {
      owner: r.owner.login,
      ownerType: r.owner.type === "Organization" ? "Organization" : "User",
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      homepage: r.homepage || null,
      defaultBranch: r.default_branch,
      language: r.language,
      license: r.license && r.license.spdx_id !== "NOASSERTION" ? { spdxId: r.license.spdx_id, name: r.license.name } : null,
      topics: r.topics ?? [],
      stars: r.stargazers_count,
      forks: r.forks_count,
      isFork: r.fork,
      htmlUrl: r.html_url,
    };

    const { data: tree } = await github.get(
      `/repos/${meta.owner}/${meta.name}/git/trees/${encodeURIComponent(meta.defaultBranch)}`,
      { params: { recursive: 1 } }
    );
    const blobs = (tree.tree as { path: string; type: string; mode: string }[]).filter((t) => t.type === "blob");
    const paths = blobs.map((t) => t.path);
    // Symlinked files (mode 120000) come back from raw.githubusercontent as their target path.
    const symlinks = new Set(blobs.filter((t) => t.mode === "120000").map((t) => t.path));

    const rootFiles = new Set(paths.filter((p) => !p.includes("/")));
    // Workspace manifests (apps/web/package.json etc.) so monorepos report their real stack.
    const nestedManifests = paths
      .filter((p) => /^(?:[^/]+\/){1,2}package\.json$/.test(p) && !p.includes("node_modules"))
      .slice(0, MAX_NESTED_MANIFESTS);
    // GitHub shows the first README it finds in .github/, the root, then docs/, in any casing.
    const readmeRe = /^(\.github\/|docs\/)?readme(\.(md|markdown|mdown|mkdn|txt))?$/i;
    const readmePath =
      [".github/", "", "docs/"]
        .map((dir) => paths.filter((p) => readmeRe.test(p) && p.toLowerCase().startsWith(dir) && !p.slice(dir.length).includes("/")))
        .map((found) => found.sort((a, b) => Number(!/\.md$/i.test(a)) - Number(!/\.md$/i.test(b)))[0])
        .find(Boolean) ?? null;
    const wanted = [
      ...(readmePath ? [readmePath] : []),
      ...KEY_FILES.filter((f) => rootFiles.has(f)),
      ...nestedManifests,
    ];
    const contents = await Promise.all(
      wanted.map((f) => fetchRaw(meta.owner, meta.name, meta.defaultBranch, f))
    );

    await Promise.all(
      wanted.map(async (f, i) => {
        const target = contents[i]?.trim();
        if (!symlinks.has(f) || !target) return;
        const resolved = posix.normalize(posix.join(posix.dirname(f), target));
        contents[i] = paths.includes(resolved)
          ? await fetchRaw(meta.owner, meta.name, meta.defaultBranch, resolved)
          : null;
      })
    );

    const files: Record<string, string> = {};
    wanted.forEach((f, i) => {
      if (contents[i] !== null) files[f] = contents[i] as string;
    });

    return { meta, paths, files, readmePath, truncated: Boolean(tree.truncated) };
  } catch (error) {
    throw toApiError(error, fullName);
  }
};

/** The README GitHub would display, if any. */
export const findReadme = (snapshot: RepoSnapshot): { path: string; content: string } | null => {
  const { readmePath, files } = snapshot;
  return readmePath && files[readmePath] !== undefined ? { path: readmePath, content: files[readmePath] } : null;
};

export interface RawCommit {
  sha: string;
  message: string;
  url: string;
  date: string | null;
  author: string | null;
}

const toRawCommit = (c: {
  sha: string;
  html_url: string;
  commit: { message: string; author?: { date?: string; name?: string } | null };
  author?: { login?: string } | null;
}): RawCommit => ({
  sha: c.sha,
  message: c.commit.message,
  url: c.html_url,
  date: c.commit.author?.date ?? null,
  author: c.author?.login ?? c.commit.author?.name ?? null,
});

/** Default branch plus the most recent tags (newest first). Two API calls. */
export const getRefs = async (owner: string, repo: string) => {
  const fullName = `${owner}/${repo}`;
  try {
    const [{ data: r }, { data: tags }] = await Promise.all([
      github.get(`/repos/${owner}/${repo}`),
      github.get(`/repos/${owner}/${repo}/tags`, { params: { per_page: 50 } }),
    ]);
    return {
      fullName: r.full_name as string,
      htmlUrl: r.html_url as string,
      defaultBranch: r.default_branch as string,
      tags: (tags as { name: string }[]).map((t) => t.name),
    };
  } catch (error) {
    throw toApiError(error, fullName);
  }
};

/**
 * Commits in `head` that aren't in `base`, oldest first. With no base, the latest 100 commits.
 * GitHub's compare endpoint returns at most 250 commits.
 */
export const getCommitRange = async (
  owner: string,
  repo: string,
  base: string | null,
  head: string
): Promise<{ commits: RawCommit[]; truncated: boolean }> => {
  const fullName = `${owner}/${repo}`;
  try {
    if (!base) {
      const { data } = await github.get(`/repos/${owner}/${repo}/commits`, { params: { sha: head, per_page: 100 } });
      return { commits: (data as Parameters<typeof toRawCommit>[0][]).map(toRawCommit).reverse(), truncated: data.length === 100 };
    }
    const { data } = await github.get(
      `/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      { params: { per_page: 250 } }
    );
    return {
      commits: (data.commits as Parameters<typeof toRawCommit>[0][]).map(toRawCommit),
      truncated: data.total_commits > data.commits.length,
    };
  } catch (error) {
    const err = toApiError(error, fullName);
    if (err.statusCode === 404) return Promise.reject(new ApiError(404, `Couldn't compare ${base ?? "start"}…${head}. Check that both refs exist.`));
    throw err;
  }
};
