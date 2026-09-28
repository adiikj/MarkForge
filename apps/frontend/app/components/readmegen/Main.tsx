"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  Columns2,
  Copy,
  Download,
  Eye,
  FileText,
  Gauge,
  PencilLine,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import Preview from "./Preview";
import Editor from "./Editor";
import RepoInput from "../RepoInput";
import { templates, type Template } from "./templates";
import { ApiRequestError, generateReadme, getQuota, type GenerateResult, type QuotaStatus } from "../../lib/api";
import { sendHandoff, takeHandoff } from "../../lib/handoff";

const DRAFT_KEY = "markforge:draft";
const LOADING_STEPS = ["Reading repository…", "Detecting the stack…", "Drafting sections…"];

type View = "write" | "split" | "preview";

interface Draft {
  markdown: string;
  label: string;
  repo: string | null;
}

const loadDraft = (): Draft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};

const Main = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState("");
  const [baseline, setBaseline] = useState("");
  const [label, setLabel] = useState("README.md");
  const [repo, setRepo] = useState<string | null>(null);
  const [detected, setDetected] = useState<GenerateResult["detected"] | null>(null);
  const [view, setView] = useState<View>("split");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  const load = (markdown: string, nextLabel: string, nextRepo: string | null = null) => {
    setContent(markdown);
    setBaseline(markdown);
    setLabel(nextLabel);
    setRepo(nextRepo);
  };

  const dirty = content !== baseline && content.trim() !== "";
  const confirmReplace = () => !dirty || window.confirm("Replace your current edits?");

  const forge = useCallback(async (input: string, skipConfirm = false) => {
    if (!skipConfirm && !confirmReplace()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateReadme(input);
      load(result.markdown, result.repo.fullName, result.repo.fullName);
      setDetected(result.detected);
      setQuota(result.quota);
      router.replace(`/generate?repo=${encodeURIComponent(result.repo.fullName)}`, { scroll: false });
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "QUOTA_EXCEEDED") {
        setQuotaHit(true);
        setQuota((q) => (q ? { ...q, remaining: 0 } : q));
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, dirty]);

  // Initial content: handoff from /health > ?repo= > saved draft > default template.
  useEffect(() => {
    const handoff = takeHandoff();
    const repoParam = searchParams.get("repo");
    const draft = loadDraft();
    if (handoff) {
      load(handoff.markdown, handoff.label ?? "README.md", handoff.repo ?? null);
    } else if (repoParam) {
      forge(repoParam, true);
    } else if (draft?.markdown) {
      setContent(draft.markdown);
      setBaseline(draft.markdown);
      setLabel(draft.label);
      setRepo(draft.repo);
    } else {
      load(templates[0].content, `${templates[0].name} template`);
    }
    setReady(true);
    getQuota().then((q) => {
      if (!q) return;
      setQuota(q);
      if (q.remaining === 0) setQuotaHit(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave locally so a refresh never loses work.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ markdown: content, label, repo } satisfies Draft));
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [content, label, repo, ready]);

  useEffect(() => {
    if (!loading) return setLoadingStep(0);
    const t = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, [loading]);

  const download = useCallback(() => {
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "README.md" });
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        download();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [download]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      editorRef.current?.select();
    }
  };

  const pickTemplate = (t: Template) => {
    if (!confirmReplace()) return;
    load(t.content, `${t.name} template`);
    setDetected(null);
    setError(null);
    router.replace("/generate", { scroll: false });
  };

  const checkHealth = () => {
    sendHandoff({ markdown: content, label, repo: repo ?? undefined });
    router.push("/health?from=studio");
  };

  const words = content.split(/\s+/).filter(Boolean).length;
  const lineCount = content.split("\n").length;

  const viewButtons: { id: View; icon: typeof Eye; label: string; className?: string }[] = [
    { id: "write", icon: PencilLine, label: "Write" },
    { id: "split", icon: Columns2, label: "Split", className: "hidden lg:flex" },
    { id: "preview", icon: Eye, label: "Preview" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-10 md:px-8 md:pt-14">
        {/* Heading */}
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">README Studio</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Forge a README</h1>
          <p className="mt-3 text-neutral-400">
            Paste a repo and MarkForge drafts one from the code, or start from a template. Everything
            autosaves in your browser.
          </p>
        </div>

        {/* Sources */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-neutral-400" /> From a repository
              {quota && (
                <Link
                  href="/pricing"
                  className="ml-auto rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[11px] font-normal text-neutral-400 transition-colors hover:border-white/25 hover:text-white"
                >
                  {quota.remaining} of {quota.limit} free today
                </Link>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">Reads package files, scripts, env vars and structure. Public repos only.</p>
            <div className="mt-4">
              <RepoInput onSubmit={(r) => forge(r)} loading={loading} buttonLabel="Forge" initialValue={searchParams.get("repo") ?? ""} />
            </div>
            {loading && (
              <p className="mt-3 flex items-center gap-2 font-mono text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {LOADING_STEPS[loadingStep]}
              </p>
            )}
            {quotaHit && !loading && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-gradient-to-r from-white/[0.08] to-transparent px-4 py-3">
                <Zap className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">You&apos;ve used today&apos;s free repo drafts.</p>
                  <p className="text-xs text-neutral-400">
                    Resets at midnight UTC. Templates and editing stay unlimited.
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200"
                >
                  See Pro
                </Link>
              </div>
            )}
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-neutral-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} aria-label="Dismiss" className="text-neutral-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {detected && !loading && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-neutral-500">Detected</span>
                {detected.stack.map((s) => (
                  <span key={s} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-neutral-300">
                    {s}
                  </span>
                ))}
                {detected.packageManager && (
                  <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-xs text-neutral-500">
                    {detected.packageManager}
                  </span>
                )}
                {detected.envVars > 0 && (
                  <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-xs text-neutral-500">
                    {detected.envVars} env vars
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-neutral-400" /> Or start from a template
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {templates.map((t) => {
                const active = label === `${t.name} template` && !repo;
                return (
                  <button
                    key={t.id}
                    onClick={() => pickTemplate(t)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      active ? "border-white/40 bg-white/[0.07]" : "border-white/10 hover:border-white/25 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">{t.kind}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-neutral-500">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
              <span className="truncate font-mono text-xs text-neutral-300">{label}</span>
              {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" title="Edited" />}
            </div>

            <div className="flex rounded-lg border border-white/10 p-0.5 sm:ml-auto">
              {viewButtons.map(({ id, icon: Icon, label: text, className }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`${className ?? "flex"} items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                    view === id ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {text}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
              <button
                onClick={checkHealth}
                disabled={!content.trim()}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
              >
                <Gauge className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Check health</span>
              </button>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={download}
                className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200"
              >
                <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>

          {/* Panes */}
          <div className="relative grid h-[calc(100vh-9rem)] min-h-[520px] lg:grid-cols-2">
            <div
              className={`min-h-0 min-w-0 ${view === "preview" ? "hidden" : "block"} ${
                view === "split" ? "lg:border-r lg:border-white/10" : "lg:col-span-2"
              }`}
            >
              <Editor ref={editorRef} content={content} onChange={setContent} onCursor={(line, col) => setCursor({ line, col })} />
            </div>
            <div
              className={`min-h-0 min-w-0 overflow-auto bg-[#070707] ${
                view === "write" ? "hidden" : view === "split" ? "hidden lg:block" : "block lg:col-span-2"
              }`}
            >
              <div className={`px-6 py-8 sm:px-10 ${view === "preview" ? "mx-auto max-w-4xl" : ""}`}>
                {content.trim() ? (
                  <Preview content={content} />
                ) : (
                  <p className="text-sm text-neutral-600">Nothing to preview yet.</p>
                )}
              </div>
            </div>

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <p className="flex items-center gap-2 font-mono text-sm text-neutral-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  {LOADING_STEPS[loadingStep]}
                </p>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-4 border-t border-white/10 px-4 py-1.5 font-mono text-[11px] text-neutral-600">
            <span>Markdown</span>
            <span>
              Ln {cursor.line}, Col {cursor.col}
            </span>
            <span className="ml-auto">
              {lineCount} lines · {words} words
            </span>
            <span className="hidden sm:inline">⌘/Ctrl S to download</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Main;
