"use client";

import { FC, ReactNode, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  FileText,
  Files,
  Gauge,
  GitBranch,
  History,
  PencilLine,
  Sparkles,
  Wand2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Activity, ActivityType, User } from "../../lib/account";

export const Avatar: FC<{ user: Pick<User, "avatarUrl" | "name" | "username">; size?: number }> = ({ user, size = 32 }) => {
  const initials = (user.name || user.username).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full border border-white/10 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-neutral-600 to-neutral-900 font-medium text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
};

export const PageHeader: FC<{ title: string; description?: ReactNode; actions?: ReactNode }> = ({ title, description, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-neutral-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: FC<{ title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }> = ({
  title,
  action,
  children,
  className,
  bodyClassName,
}) => (
  <section className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] ${className ?? ""}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {action}
      </div>
    )}
    <div className={bodyClassName ?? "p-5"}>{children}</div>
  </section>
);

export const EmptyState: FC<{ icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }> = ({ icon: Icon, title, children, action }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
      <Icon className="h-5 w-5 text-neutral-400" />
    </span>
    <p className="mt-4 font-medium">{title}</p>
    {children && <p className="mt-1.5 max-w-sm text-sm text-neutral-500">{children}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Skeleton: FC<{ className?: string }> = ({ className }) => <div className={`animate-pulse rounded-lg bg-white/[0.05] ${className ?? ""}`} />;

export const btn = {
  primary: "inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-white/30 hover:bg-white/[0.04] disabled:opacity-50",
  ghost: "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40",
  danger:
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50",
};

/** Accessible confirm dialog (Escape closes, focus moves into it). */
export const ConfirmDialog: FC<{
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  /** When set, the confirm button stays disabled until the user types this text. */
  requireText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, children, confirmLabel, danger, busy, requireText, onConfirm, onCancel }) => {
  const [typed, setTyped] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return setTyped("");
    ref.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  const blocked = requireText !== undefined && typed.trim().toLowerCase() !== requireText.toLowerCase();
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" onMouseDown={onCancel}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="animate-fade-up w-full max-w-md rounded-2xl border border-white/15 bg-[#0d0d0d] p-6 shadow-2xl shadow-black"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        {children && <div className="mt-2 text-sm text-neutral-400">{children}</div>}
        {requireText !== undefined && (
          <label className="mt-4 block text-xs text-neutral-500">
            Type <span className="font-mono text-neutral-200">{requireText}</span> to confirm
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-white outline-none focus:border-white/30"
            />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className={btn.secondary}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy || blocked} className={danger ? btn.danger : btn.primary}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export const relativeTime = (iso: string) => {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
};

const ACTIVITY: Record<ActivityType, { label: string; icon: LucideIcon; href?: (a: Activity) => string }> = {
  README_DRAFT: { label: "Drafted a README", icon: PencilLine, href: (a) => `/generate?repo=${a.repo}` },
  AI_DRAFT: { label: "AI wrote a README", icon: Sparkles },
  AI_REVISE: { label: "Revised a README with AI", icon: Wand2 },
  DOCS_PACK: { label: "Generated a docs pack", icon: Files, href: (a) => `/docs-pack?repo=${a.repo}` },
  CHANGELOG: { label: "Generated a changelog", icon: History, href: (a) => `/changelog?repo=${a.repo}` },
  DIAGRAM: { label: "Mapped a repo diagram", icon: Workflow, href: (a) => `/diagrams?repo=${a.repo}` },
  HEALTH_CHECK: { label: "Checked README health", icon: Gauge, href: (a) => `/health?repo=${a.repo}` },
  DOCUMENT_SAVED: { label: "Saved a document", icon: FileText },
  REPO_TRACKED: { label: "Started tracking a repo", icon: GitBranch },
};

export const activityInfo = (a: Activity) => {
  const info = ACTIVITY[a.type] ?? { label: a.type, icon: BadgeCheck };
  const m = a.meta ?? {};
  const detail =
    typeof m.score === "number"
      ? `Score ${m.score}${typeof m.grade === "string" ? ` (${m.grade})` : ""}`
      : typeof m.files === "number"
        ? `${m.files} new file${m.files === 1 ? "" : "s"}`
        : typeof m.entries === "number"
          ? `${m.entries} change${m.entries === 1 ? "" : "s"}${typeof m.from === "string" ? ` since ${m.from}` : ""}`
          : typeof m.title === "string"
            ? m.title
            : null;
  return { ...info, detail, href: a.repo && info.href ? info.href(a) : undefined };
};

export const ACTIVITY_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "AI_DRAFT", label: "AI drafts" },
  { value: "README_DRAFT", label: "Quick drafts" },
  { value: "HEALTH_CHECK", label: "Health checks" },
  { value: "DOCS_PACK", label: "Docs packs" },
  { value: "CHANGELOG", label: "Changelogs" },
  { value: "DOCUMENT_SAVED", label: "Saved docs" },
];
