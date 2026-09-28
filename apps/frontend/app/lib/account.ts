// Typed client for auth, account and dashboard endpoints (mirrors apps/backend controllers).
import { apiGet, apiSend, type QuotaStatus } from "./api";

export interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  github: { login: string } | null;
  plan: "FREE" | "PRO" | "TEAM";
  createdAt: string;
}

export type ActivityType =
  | "README_DRAFT"
  | "AI_DRAFT"
  | "AI_REVISE"
  | "DOCS_PACK"
  | "CHANGELOG"
  | "DIAGRAM"
  | "HEALTH_CHECK"
  | "DOCUMENT_SAVED"
  | "REPO_TRACKED";

export interface Activity {
  id: string;
  type: ActivityType;
  repo: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export type DocumentKind = "README" | "PROFILE" | "DOCS" | "CHANGELOG" | "OTHER";

export interface DocumentSummary {
  id: string;
  title: string;
  kind: DocumentKind;
  repo: string | null;
  createdAt: string;
  updatedAt: string;
  excerpt: string;
  size: number;
}

export interface Doc extends Omit<DocumentSummary, "excerpt" | "size"> {
  content: string;
}

export interface TrackedRepo {
  id: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  lastScore: number | null;
  lastGrade: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  history: { score: number; createdAt: string }[];
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface Overview {
  stats: { documents: number; repos: number; averageScore: number | null; activityThisWeek: number };
  limits: { documents: number; repos: number };
  quota: QuotaStatus;
  trend: { day: string; count: number }[];
  recentActivity: Activity[];
  recentDocuments: Pick<DocumentSummary, "id" | "title" | "kind" | "repo" | "updatedAt">[];
}

type UserRes = { user: User };

export const authApi = {
  providers: () => apiGet<{ password: boolean; github: boolean }>("/api/auth/providers"),
  me: () => apiGet<{ user: User; quota: QuotaStatus }>("/api/auth/me"),
  signup: (b: { email: string; username: string; password: string; name?: string }) => apiSend<UserRes>("POST", "/api/auth/signup", b),
  login: (b: { identifier: string; password: string }) => apiSend<UserRes>("POST", "/api/auth/login", b),
  logout: () => apiSend<null>("POST", "/api/auth/logout"),
  verifyEmail: (token: string) => apiSend<UserRes>("POST", "/api/auth/verify-email", { token }),
  resendVerification: () => apiSend<null>("POST", "/api/auth/resend-verification"),
  forgotPassword: (email: string) => apiSend<null>("POST", "/api/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => apiSend<UserRes>("POST", "/api/auth/reset-password", { token, password }),
  githubUrl: (next = "/dashboard") => `/api/auth/github?next=${encodeURIComponent(next)}`,
};

export const accountApi = {
  update: (b: { name?: string | null; username?: string }) => apiSend<UserRes>("PATCH", "/api/account", b),
  changePassword: (b: { currentPassword?: string; newPassword: string }) => apiSend<UserRes>("POST", "/api/account/password", b),
  sessions: () => apiGet<{ sessions: SessionInfo[] }>("/api/account/sessions"),
  revokeSession: (id: string) => apiSend<null>("DELETE", `/api/account/sessions/${id}`),
  revokeOthers: () => apiSend<null>("POST", "/api/account/sessions/revoke-others"),
  unlinkGithub: () => apiSend<UserRes>("DELETE", "/api/account/github"),
  deleteAccount: (confirm: string) => apiSend<null>("DELETE", "/api/account", { confirm }),
};

export const dashboardApi = {
  overview: () => apiGet<Overview>("/api/dashboard/overview"),
  documents: (q = "") => apiGet<{ documents: DocumentSummary[]; limit: number }>(`/api/documents${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  document: (id: string) => apiGet<{ document: Doc }>(`/api/documents/${id}`),
  createDocument: (b: { title: string; content: string; kind?: DocumentKind; repo?: string | null }) =>
    apiSend<{ document: Doc }>("POST", "/api/documents", b),
  updateDocument: (id: string, b: Partial<{ title: string; content: string; kind: DocumentKind; repo: string | null }>) =>
    apiSend<{ document: Doc }>("PATCH", `/api/documents/${id}`, b),
  deleteDocument: (id: string) => apiSend<null>("DELETE", `/api/documents/${id}`),
  repos: () => apiGet<{ repos: TrackedRepo[]; limit: number }>("/api/repos"),
  trackRepo: (repo: string) => apiSend<{ repo: TrackedRepo; hasReadme: boolean }>("POST", "/api/repos", { repo }),
  recheckRepo: (id: string) => apiSend<{ repo: TrackedRepo; previousScore: number | null }>("POST", `/api/repos/${id}/check`),
  untrackRepo: (id: string) => apiSend<null>("DELETE", `/api/repos/${id}`),
  activity: (cursor?: string | null, type?: string) => {
    const q = new URLSearchParams();
    if (cursor) q.set("cursor", cursor);
    if (type) q.set("type", type);
    return apiGet<{ items: Activity[]; nextCursor: string | null }>(`/api/activity${q.size ? `?${q}` : ""}`);
  },
};
