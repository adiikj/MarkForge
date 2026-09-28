// Types mirror apps/backend/src/services/healthCheck.service.ts and readme.controller.ts.

// Empty = same origin: requests go to /api on this app and next.config.ts proxies them to the backend.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

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
  /** null = unlimited */
  limit: number | null;
  used: number;
  /** null = unlimited */
  remaining: number | null;
  resetsAt: string;
  scope?: "anonymous" | "account";
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

// ---- Transport: same-origin fetch with transparent session refresh ----

let refreshing: Promise<boolean> | null = null;

/** Rotates the refresh token once, shared by every request that hit an expired access token. */
export const refreshSession = (): Promise<boolean> =>
  (refreshing ??= (async () => {
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" });
        if (res.ok) return true;
        // Another tab rotated at the same moment; its new cookie is already ours, so retry.
        const json = await res.json().catch(() => null);
        if (res.status !== 409 || json?.errors?.[0]?.code !== "REFRESH_RACE") return false;
      }
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })());

/** fetch() for the MarkForge API: includes cookies and retries once after refreshing an expired session. */
export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const doFetch = () => fetch(`${API_URL}${path}`, { credentials: "include", ...init });
  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiRequestError("Couldn't reach the MarkForge API. Is the backend running?");
  }
  if (res.status === 401) {
    const json = await res.clone().json().catch(() => null);
    if (json?.errors?.[0]?.code === "TOKEN_EXPIRED" && (await refreshSession())) res = await doFetch();
  }
  return res;
};

/** Parses the standard { data } envelope or throws ApiRequestError with the server's message and code. */
export const unwrap = async <T>(res: Response): Promise<T> => {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.errors?.[0];
    throw new ApiRequestError(json?.message ?? `Request failed (${res.status}).`, detail?.code ?? detail?.field, detail);
  }
  return json?.data as T;
};

export const apiGet = async <T>(path: string, signal?: AbortSignal) => unwrap<T>(await apiFetch(path, { signal }));

export const apiSend = async <T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown, signal?: AbortSignal) =>
  unwrap<T>(
    await apiFetch(path, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );

const post = <T>(path: string, body: unknown, signal?: AbortSignal) => apiSend<T>("POST", path, body, signal);

export const getQuota = async (): Promise<QuotaStatus | null> => {
  try {
    const res = await apiFetch(`/api/readme/quota`);
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

// ---- AI drafts (server-sent events) ----

export interface AiStatus {
  enabled: boolean;
  model: string;
}

export const getAiStatus = async (): Promise<AiStatus | null> => {
  try {
    const res = await apiFetch(`/api/ai/status`);
    if (!res.ok) return null;
    return (await res.json()).data as AiStatus;
  } catch {
    return null;
  }
};

export interface AiStreamHandlers {
  onMeta?: (meta: { repo: RepoSummary; model: string; mode: "draft" | "refine"; stack: string[] }) => void;
  onDelta: (text: string) => void;
  onDone?: (done: { finishReason: string | null; truncated: boolean; quota: QuotaStatus }) => void;
}

/**
 * Streams an AI README draft (or a revision when `instruction` is set).
 * Resolves when the stream ends; throws ApiRequestError on failure (including mid-stream errors).
 */
export const streamAiReadme = async (
  body: { repo: string; current?: string; instruction?: string },
  handlers: AiStreamHandlers,
  signal?: AbortSignal
): Promise<void> => {
  let res: Response;
  try {
    res = await apiFetch(`/api/ai/readme`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    throw err;
  }
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => null);
    const detail = json?.errors?.[0];
    throw new ApiRequestError(json?.message ?? `Request failed (${res.status}).`, detail?.code, detail);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      // SSE events are separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const event = raw.match(/^event: (.*)$/m)?.[1];
        const data = raw.match(/^data: (.*)$/m)?.[1];
        if (!event || data === undefined) continue;
        const payload = JSON.parse(data);
        if (event === "meta") handlers.onMeta?.(payload);
        else if (event === "delta") handlers.onDelta(payload.text);
        else if (event === "done") handlers.onDone?.(payload);
        else if (event === "error") throw new ApiRequestError(payload.message);
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    throw err;
  }
};

/** Models sometimes wrap the whole README in a ```markdown fence despite instructions. */
export const unwrapMarkdownFence = (md: string): string => {
  const m = md.trim().match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i);
  return (m ? m[1] : md.trim()) + "\n";
};
