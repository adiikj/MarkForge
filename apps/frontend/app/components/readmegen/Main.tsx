"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CloudUpload,
  Columns2,
  Loader2,
  Copy,
  Download,
  Eye,
  FileText,
  Gauge,
  LayoutGrid,
  PencilLine,
  Sparkles,
  Square,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import Preview from "./Preview";
import Editor from "./Editor";
import BlocksPanel from "./BlocksPanel";
import RepoInput from "../RepoInput";
import QuotaNotice, { QuotaChip } from "../shared/QuotaNotice";
import { templates, type Template } from "./templates";
import {
  ApiRequestError,
  generateReadme,
  getQuota,
  getRepoProfile,
  getAiStatus,
  streamAiReadme,
  unwrapMarkdownFence,
  type AiStatus,
  type GenerateResult,
  type QuotaStatus,
  type RepoProfile,
} from "../../lib/api";
import type { Block } from "../../lib/blocks";
import { sendHandoff, takeHandoff } from "../../lib/handoff";
import { applyOp } from "../../lib/applyFix";
import { useAuth } from "../../lib/auth";
import { dashboardApi } from "../../lib/account";
import { useToast } from "../../lib/toast";

const DRAFT_KEY = "markforge:draft";
const LOADING_STEPS = ["Reading repository…", "Detecting the stack…", "Drafting sections…"];

type View = "write" | "split" | "preview";

interface Draft {
  markdown: string;
  label: string;
  repo: string | null;
  /** Set when the draft is a saved document, so unsaved edits survive a refresh. */
  docId?: string | null;
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
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [draftMode, setDraftMode] = useState<"ai" | "quick">("ai");
  // null = idle; "reading" until the first token arrives, then "writing".
  const [aiPhase, setAiPhase] = useState<null | "reading" | "writing">(null);
  const [refineText, setRefineText] = useState("");
  const aiAbort = useRef<AbortController | null>(null);
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  // Cloud save: the document this draft belongs to, and the content last saved to it.
  const [docId, setDocId] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // State updates are async, so a double-click or key repeat could start two saves (and create
  // two documents); this ref blocks re-entry synchronously.
  const savingRef = useRef(false);
  const [profile, setProfile] = useState<RepoProfile | null>(null);
  // Until the user places the caret, blocks go at the end rather than position 0.
  const caretTouched = useRef(false);

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
      setDocId(null);
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

  const handleQuotaOrError = (err: unknown) => {
    if (err instanceof ApiRequestError && err.code === "QUOTA_EXCEEDED") {
      setQuotaHit(true);
      setQuota((q) => (q ? { ...q, remaining: 0 } : q));
    } else {
      setError((err as Error).message);
    }
  };

  /** Streams an AI draft (or a revision of the current one) into the editor. */
  const runAi = async (input: { repo: string; instruction?: string }) => {
    const refining = input.instruction !== undefined;
    if (!refining && !confirmReplace()) return;
    const before = content;
    const beforeLabel = label;
    const controller = new AbortController();
    aiAbort.current = controller;
    setError(null);
    setAiPhase("reading");
    let text = "";
    try {
      await streamAiReadme(
        refining ? { repo: input.repo, current: before, instruction: input.instruction } : { repo: input.repo },
        {
          onMeta: (meta) => {
            if (!refining) {
              setDocId(null);
              setLabel(meta.repo.fullName);
              setRepo(meta.repo.fullName);
              setDetected(null);
              router.replace(`/generate?repo=${encodeURIComponent(meta.repo.fullName)}`, { scroll: false });
            }
          },
          onDelta: (delta) => {
            if (!text) setAiPhase("writing");
            text += delta;
            setContent(text);
          },
          onDone: (done) => {
            setQuota(done.quota);
            if (done.truncated) setError("The AI hit its length limit, so the end may be cut off.");
          },
        },
        controller.signal
      );
      if (controller.signal.aborted) {
        // Stopped: keep what was written if it's a fresh draft; restore the original on a revision.
        if (refining || !text) setContent(before);
        return;
      }
      if (!text.trim()) {
        setContent(before);
        setLabel(beforeLabel);
        setError("The AI returned an empty draft. Try again.");
        return;
      }
      const final = unwrapMarkdownFence(text);
      setContent(final);
      if (!refining) setBaseline(final);
      setRefineText("");
    } catch (err) {
      setContent(before);
      setLabel(beforeLabel);
      handleQuotaOrError(err);
    } finally {
      setAiPhase(null);
      aiAbort.current = null;
    }
  };

  const stopAi = () => aiAbort.current?.abort();

  // Initial content: handoff from /health > ?repo= > saved draft > default template.
  useEffect(() => {
    const handoff = takeHandoff();
    const repoParam = searchParams.get("repo");
    const draft = loadDraft();
    if (searchParams.get("doc") && !handoff) {
      // Loaded from the account once auth is known (effect below).
    } else if (handoff && "markdown" in handoff) {
      load(handoff.markdown, handoff.label ?? "README.md", handoff.repo ?? null);
    } else if (handoff && "append" in handoff) {
      const base = draft?.markdown ?? "";
      let next = applyOp(base, { type: "append", content: handoff.append });
      if (handoff.topAnchor && !next.includes(handoff.topAnchor)) next = `${handoff.topAnchor}\n${next}`;
      setContent(next);
      setBaseline(base);
      setLabel(draft?.label ?? "README.md");
      setRepo(draft?.repo ?? handoff.repo ?? null);
    } else if (handoff && "insertAfterTitle" in handoff) {
      const base = draft?.markdown ?? "";
      const next = applyOp(base, { type: "afterTitle", content: handoff.insertAfterTitle });
      setContent(next);
      setBaseline(base);
      setLabel(draft?.label ?? "README.md");
      setRepo(draft?.repo ?? handoff.repo ?? null);
    } else if (repoParam) {
      forge(repoParam, true);
    } else if (draft?.markdown) {
      setContent(draft.markdown);
      setBaseline(draft.markdown);
      setLabel(draft.label);
      setRepo(draft.repo);
      setDocId(draft.docId ?? null);
    } else {
      load(templates[0].content, `${templates[0].name} template`);
    }
    if (searchParams.get("blocks")) setBlocksOpen(true);
    getAiStatus().then((s) => {
      setAi(s);
      if (!s?.enabled) setDraftMode("quick");
    });
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
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ markdown: content, label, repo, docId } satisfies Draft));
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [content, label, repo, docId, ready]);

  useEffect(() => {
    if (!loading) return setLoadingStep(0);
    const t = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, [loading]);

  // Open a saved document (?doc=<id>) once we know who's signed in.
  const docParam = searchParams.get("doc");
  useEffect(() => {
    if (!docParam || authLoading) return;
    if (!user) {
      toast("Log in to open your saved documents.", "error");
      router.replace(`/login?next=${encodeURIComponent(`/generate?doc=${docParam}`)}`);
      return;
    }
    dashboardApi
      .document(docParam)
      .then(({ document }) => {
        const draft = loadDraft();
        // Unsaved local edits to this same document win over the server copy.
        const local = draft?.docId === document.id && draft.markdown !== document.content ? draft.markdown : null;
        setContent(local ?? document.content);
        setBaseline(document.content);
        setLabel(document.title);
        setRepo(document.repo);
        setDocId(document.id);
        setSavedContent(document.content);
        if (local) toast("Restored your unsaved changes to this document.");
      })
      .catch((err) => {
        toast((err as Error).message, "error");
        router.replace("/generate");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docParam, authLoading, user]);

  const unsaved = docId ? content !== savedContent : Boolean(content.trim());

  const save = useCallback(async () => {
    if (!user) {
      toast("Log in to save. Your draft stays here in the meantime.");
      router.push(`/login?next=${encodeURIComponent("/generate")}`);
      return;
    }
    if (!content.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const title = label.replace(/ template$/, "").trim() || "Untitled";
      if (docId) {
        await dashboardApi.updateDocument(docId, { content, title });
      } else {
        const kind = /^(Classic|Minimal|Dev Card)$/.test(title) ? "PROFILE" : "README";
        const { document } = await dashboardApi.createDocument({ title, content, kind, repo });
        setDocId(document.id);
        setLabel(document.title);
        router.replace(`/generate?doc=${document.id}`, { scroll: false });
      }
      setSavedContent(content);
      setBaseline(content);
      toast(docId ? "Saved." : "Saved to your documents.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [user, content, label, docId, repo, router, toast]);

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
        if (user) save();
        else download();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [download, save, user]);

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
    setDocId(null);
    setDetected(null);
    setError(null);
    router.replace("/generate", { scroll: false });
  };

  // Once the editor has been focused its caret position is meaningful for inserting blocks.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onFocus = () => (caretTouched.current = true);
    el.addEventListener("focus", onFocus);
    return () => el.removeEventListener("focus", onFocus);
  }, []);

  // Section blocks fill in repo details (stack, env vars, license) when the draft came from a repo.
  useEffect(() => {
    if (!blocksOpen || !repo || profile?.repo.fullName.toLowerCase() === repo.toLowerCase()) return;
    getRepoProfile(repo).then(setProfile).catch(() => setProfile(null));
  }, [blocksOpen, repo, profile]);

  const toggleBlocks = () => {
    setBlocksOpen((o) => !o);
    if (view === "preview") setView("split");
  };

  const insertBlock = (block: Block) => {
    const el = editorRef.current;
    let pos = el && caretTouched.current ? el.selectionEnd : content.length;
    // Snap to the end of the current line so a block never splits a line.
    const eol = content.indexOf("\n", pos);
    if (pos > 0 && content[pos - 1] !== "\n") pos = eol === -1 ? content.length : eol;

    const text = block.build({ repo, profile, markdown: content }).trim();
    const before = content.slice(0, pos).replace(/\s*$/, "");
    const after = content.slice(pos).replace(/^\s*/, "");
    let next = [before, text, after].filter(Boolean).join("\n\n") + (after ? "" : "\n");
    let caret = (before ? before.length + 2 : 0) + text.length;
    if (block.topAnchor && !content.includes(block.topAnchor)) {
      next = `${block.topAnchor}\n${next}`;
      caret += block.topAnchor.length + 1;
    }
    setContent(next);
    requestAnimationFrame(() => {
      if (!editorRef.current || editorRef.current.offsetParent === null) return;
      editorRef.current.focus();
      editorRef.current.setSelectionRange(caret, caret);
      caretTouched.current = true;
    });
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
                <span className="ml-auto">
                  <QuotaChip quota={quota} />
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              {draftMode === "ai"
                ? "AI reads the code and writes a complete README, grounded in the repo's real commands. Public repos only."
                : "Reads package files, scripts, env vars and structure, and leaves TODOs for you. Public repos only."}
            </p>
            <div className="mt-4 inline-flex rounded-lg border border-white/10 p-0.5">
              {([
                ["ai", Wand2, "AI draft"],
                ["quick", Zap, "Quick draft"],
              ] as const).map(([mode, Icon, text]) => {
                const disabled = mode === "ai" && ai !== null && !ai.enabled;
                return (
                  <button
                    key={mode}
                    onClick={() => setDraftMode(mode)}
                    disabled={disabled}
                    title={disabled ? "AI isn't configured on this server" : undefined}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      draftMode === mode ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {text}
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <RepoInput
                onSubmit={(r) => (draftMode === "ai" ? runAi({ repo: r }) : forge(r))}
                loading={loading || aiPhase !== null}
                buttonLabel={draftMode === "ai" ? "Write it" : "Forge"}
                initialValue={searchParams.get("repo") ?? ""}
              />
            </div>
            {loading && (
              <p className="mt-3 flex items-center gap-2 font-mono text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                {LOADING_STEPS[loadingStep]}
              </p>
            )}
            {quotaHit && !loading && (
              <div className="mt-3">
                <QuotaNotice anonymous={quota?.scope === "anonymous"} />
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

        {/* AI revise bar */}
        {ai?.enabled && repo && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (refineText.trim() && !aiPhase) runAi({ repo, instruction: refineText.trim() });
            }}
            className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a] p-1.5 pl-4 focus-within:border-white/25"
          >
            <Wand2 className="h-4 w-4 shrink-0 text-neutral-500" />
            <input
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              maxLength={500}
              disabled={aiPhase !== null}
              placeholder="Ask AI to revise: “make it shorter”, “add a FAQ”, “friendlier tone”…"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-neutral-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!refineText.trim() || aiPhase !== null}
              className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
            >
              Revise
            </button>
          </form>
        )}

        {/* Workspace */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
              <span className="truncate font-mono text-xs text-neutral-300">{label}</span>
              {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" title="Edited" />}
              {aiPhase && (
                <span className="ml-2 flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] py-0.5 pl-2.5 pr-1 text-[11px] text-neutral-200">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  {aiPhase === "reading" ? "Reading the code…" : "Writing…"}
                  <button
                    onClick={stopAi}
                    className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-black hover:bg-neutral-200"
                  >
                    <Square className="h-2.5 w-2.5 fill-current" /> Stop
                  </button>
                </span>
              )}
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
                onClick={toggleBlocks}
                aria-pressed={blocksOpen}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  blocksOpen ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-neutral-300 hover:border-white/25 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Blocks</span>
              </button>
              <button
                onClick={save}
                disabled={saving || (Boolean(docId) && !unsaved)}
                title={user ? (docId ? "Save changes (⌘/Ctrl S)" : "Save to your documents (⌘/Ctrl S)") : "Log in to save"}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : docId && !unsaved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <CloudUpload className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{docId && !unsaved ? "Saved" : "Save"}</span>
              </button>
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
          <div className="relative flex h-[calc(100vh-9rem)] min-h-[520px]">
            {blocksOpen && (
              <div className="absolute inset-0 z-20 lg:static lg:z-auto lg:w-64 lg:shrink-0 lg:border-r lg:border-white/10">
                <BlocksPanel
                  context={{ repo, profile, markdown: content }}
                  onInsert={(b) => {
                    insertBlock(b);
                    // On small screens the panel covers the editor; close it so the result is visible.
                    if (window.matchMedia("(max-width: 1023px)").matches) setBlocksOpen(false);
                  }}
                  onClose={() => setBlocksOpen(false)}
                />
              </div>
            )}
            <div
              className={`min-h-0 min-w-0 flex-1 ${view === "preview" ? "hidden" : "block"} ${
                view === "split" ? "lg:border-r lg:border-white/10" : ""
              }`}
            >
              <Editor
                ref={editorRef}
                content={content}
                onChange={setContent}
                onCursor={(line, col) => setCursor({ line, col })}
              />
            </div>
            <div
              className={`min-h-0 min-w-0 flex-1 overflow-auto bg-[#070707] ${
                view === "write" ? "hidden" : view === "split" ? "hidden lg:block" : "block"
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

            {(loading || aiPhase === "reading") && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <p className="flex items-center gap-2 font-mono text-sm text-neutral-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  {aiPhase === "reading" ? "Reading the code and planning the README…" : LOADING_STEPS[loadingStep]}
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
            <span className="hidden sm:inline">⌘/Ctrl S to {user ? "save" : "download"}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Main;
