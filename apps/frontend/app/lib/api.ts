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

export const generateReadme = (repo: string, signal?: AbortSignal) =>
  post<GenerateResult>("/api/readme/generate", { repo }, signal);

export const checkHealth = (
  input: { repo: string; markdown?: string } | { markdown: string; kind: "project" | "profile" },
  signal?: AbortSignal
) => post<HealthResult>("/api/readme/health", input, signal);
