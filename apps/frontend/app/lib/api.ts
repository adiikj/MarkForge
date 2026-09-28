// Types mirror apps/backend/src/services/healthCheck.service.ts and readme.controller.ts.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type FixOp =
  | { type: "prepend"; content: string }
  | { type: "afterTitle"; content: string }
  | { type: "beforeFirstSection"; content: string }
  | { type: "beforeClosingSections"; content: string }
  | { type: "append"; content: string }
  | { type: "replace"; find: string; replace: string };

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckCategory = "essentials" | "links" | "structure" | "polish";

export interface Check {
  id: string;
  label: string;
  category: CheckCategory;
  status: CheckStatus;
  weight: number;
  detail: string;
  items?: string[];
  fix?: { label: string; ops: FixOp[] };
}

export interface HealthReport {
  score: number;
  grade: string;
  verdict: string;
  checks: Check[];
  stats: { words: number; headings: number; images: number; links: number; codeBlocks: number };
}

export interface RepoSummary {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
}

export interface HealthResult {
  source: "repo" | "paste";
  repo?: RepoSummary;
  readmePath?: string;
  report: HealthReport | null;
  markdown: string | null;
}

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

export interface GenerateResult {
  repo: RepoSummary;
  markdown: string;
  detected: {
    ecosystem: string;
    packageManager: string | null;
    stack: string[];
    envVars: number;
    scripts: string[];
    isMonorepo: boolean;
  };
  hasExistingReadme: boolean;
  quota: QuotaStatus;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    /** Machine-readable reason from the API, e.g. "QUOTA_EXCEEDED". */
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

const post = async <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiRequestError("Couldn't reach the MarkForge API. Is the backend running?");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.errors?.[0];
    throw new ApiRequestError(json?.message ?? `Request failed (${res.status}).`, detail?.code, detail);
  }
  return json.data as T;
};

export const getQuota = async (): Promise<QuotaStatus | null> => {
  try {
    const res = await fetch(`${API_URL}/api/readme/quota`);
    if (!res.ok) return null;
    return (await res.json()).data.generate as QuotaStatus;
  } catch {
    return null;
  }
};

export interface RepoProfile {
  repo: RepoSummary;
  owner: string;
  name: string;
  homepage: string | null;
  license: { spdxId: string; name: string } | null;
  ecosystem: string;
  packageManager: string | null;
  stack: string[];
  npmPackage: string | null;
  pypiPackage: string | null;
  crateName: string | null;
  goModule: string | null;
  ciWorkflows: string[];
  hasDocker: boolean;
  licensePath: string | null;
  contributingPath: string | null;
  envVars: { key: string; example: string; comment: string | null }[];
}

export interface DocFile {
  id: string;
  path: string;
  title: string;
  description: string;
  content: string;
  exists: boolean;
  existingPath: string | null;
}

export interface DocsPackResult {
  repo: RepoSummary;
  files: DocFile[];
  quota: QuotaStatus;
}

export type ChangeKind = "breaking" | "added" | "changed" | "deprecated" | "removed" | "fixed" | "security" | "performance" | "docs" | "other";

export interface ChangeEntry {
  kind: ChangeKind;
  scope: string | null;
  subject: string;
  breaking: boolean;
  pr: number | null;
  sha: string;
  url: string;
  author: string | null;
  noise: boolean;
}

export interface ChangelogRefs {
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  tags: string[];
}

export interface ChangelogResult {
  repo: { fullName: string; htmlUrl: string };
  from: string | null;
  to: string;
  commitCount: number;
  truncated: boolean;
  entries: ChangeEntry[];
  quota: QuotaStatus;
}

export interface DiagramResult {
  repo: RepoSummary;
  architecture: string;
  structure: string;
  quota: QuotaStatus;
}

export const getChangelogRefs = (repo: string) => post<ChangelogRefs>("/api/tools/changelog/refs", { repo });

export const generateChangelog = (repo: string, from: string | null, to: string) =>
  post<ChangelogResult>("/api/tools/changelog", { repo, from, to });

export const generateRepoDiagram = (repo: string) => post<DiagramResult>("/api/tools/diagram", { repo });

export const getRepoProfile = (repo: string, signal?: AbortSignal) =>
  post<RepoProfile>("/api/tools/repo-profile", { repo }, signal);

export const generateDocsPack = (repo: string, contactEmail?: string, signal?: AbortSignal) =>
  post<DocsPackResult>("/api/tools/docs-pack", { repo, contactEmail: contactEmail || undefined }, signal);

export const generateReadme = (repo: string, signal?: AbortSignal) =>
  post<GenerateResult>("/api/readme/generate", { repo }, signal);

export const checkHealth = (
  input: { repo: string; markdown?: string } | { markdown: string; kind: "project" | "profile" },
  signal?: AbortSignal
) => post<HealthResult>("/api/readme/health", input, signal);
