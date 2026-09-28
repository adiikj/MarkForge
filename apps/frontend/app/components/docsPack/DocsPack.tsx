"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { strToU8, zipSync } from "fflate";
import { AlertCircle, Archive, Check, Copy, Download, Eye, FileText, Mail, PencilLine, X } from "lucide-react";
import RepoInput from "../RepoInput";
import Preview from "../readmegen/Preview";
import QuotaNotice, { QuotaChip } from "../shared/QuotaNotice";
import { ApiRequestError, generateDocsPack, getQuota, type DocFile, type QuotaStatus, type RepoSummary } from "../../lib/api";

const LOADING_STEPS = ["Reading repository…", "Finding existing docs…", "Writing files…"];

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
};

// Issue/PR templates start with YAML front matter that GitHub hides; hide it in the preview too.
const stripFrontMatter = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n/, "");

const DocsPack = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [repo, setRepo] = useState<RepoSummary | null>(null);
  const [files, setFiles] = useState<DocFile[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getQuota().then((q) => {
      if (!q) return;
      setQuota(q);
      if (q.remaining === 0) setQuotaHit(true);
    });
  }, []);

  useEffect(() => {
    if (!loading) return setLoadingStep(0);
    const t = setInterval(() => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, [loading]);

  const run = async (input: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateDocsPack(input, email.trim());
      setRepo(res.repo);
      setFiles(res.files);
      setPicked(new Set(res.files.filter((f) => !f.exists).map((f) => f.id)));
      setActive(res.files.find((f) => !f.exists)?.id ?? res.files[0]?.id ?? null);
      setQuota(res.quota);
      router.replace(`/docs-pack?repo=${encodeURIComponent(res.repo.fullName)}`, { scroll: false });
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
  };

  const current = files.find((f) => f.id === active) ?? null;
  const selected = files.filter((f) => picked.has(f.id));

  const togglePick = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const edit = (content: string) => setFiles((fs) => fs.map((f) => (f.id === active ? { ...f, content } : f)));

  const downloadZip = () => {
    const data = zipSync(Object.fromEntries(selected.map((f) => [f.path, strToU8(f.content)])));
    saveBlob(new Blob([data as BlobPart], { type: "application/zip" }), `${repo?.fullName.split("/")[1] ?? "repo"}-docs.zip`);
  };

  const downloadOne = (f: DocFile) => saveBlob(new Blob([f.content], { type: "text/markdown" }), f.path.split("/").pop()!);

  const copy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Repo Docs Pack</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Every file a healthy repo has</h1>
          <p className="mt-3 text-neutral-400">
            CONTRIBUTING, Code of Conduct, SECURITY, issue and PR templates, and a CHANGELOG, written with your repo&apos;s
            real commands. Files you already have are skipped by default.
          </p>
        </div>

        <div className="mt-8 max-w-2xl space-y-3">
          <RepoInput onSubmit={run} loading={loading} buttonLabel="Generate" initialValue={searchParams.get("repo") ?? ""} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 focus-within:border-white/25">
              <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contact email for conduct & security reports (optional)"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-600"
              />
            </label>
            {quota && <QuotaChip quota={quota} />}
          </div>
          {loading && (
            <p className="flex items-center gap-2 font-mono text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              {LOADING_STEPS[loadingStep]}
            </p>
          )}
          {quotaHit && !loading && <QuotaNotice anonymous={quota?.scope === "anonymous"} />}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-neutral-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} aria-label="Dismiss" className="text-neutral-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* File list */}
            <aside className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] lg:sticky lg:top-24">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="truncate font-mono text-xs text-neutral-400">{repo?.fullName}</p>
                <span className="font-mono text-[11px] text-neutral-600">
                  {selected.length}/{files.length}
                </span>
              </div>
              <ul className="divide-y divide-white/[0.06]">
                {files.map((f) => (
                  <li key={f.id} className={`flex items-start gap-3 px-4 py-3 ${active === f.id ? "bg-white/[0.05]" : ""}`}>
                    <button
                      onClick={() => togglePick(f.id)}
                      aria-label={`${picked.has(f.id) ? "Exclude" : "Include"} ${f.path}`}
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        picked.has(f.id) ? "border-white bg-white text-black" : "border-white/25"
                      }`}
                    >
                      {picked.has(f.id) && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <button onClick={() => setActive(f.id)} className="min-w-0 flex-1 text-left">
                      <span className="block text-sm text-neutral-100">{f.title}</span>
                      <span className="block truncate font-mono text-[11px] text-neutral-500">{f.path}</span>
                      {f.exists && (
                        <span className="mt-1 inline-block rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-400">
                          Already in repo{f.existingPath && f.existingPath !== f.path ? `: ${f.existingPath}` : ""}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/10 p-3">
                <button
                  onClick={downloadZip}
                  disabled={!selected.length}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
                >
                  <Archive className="h-4 w-4" /> Download {selected.length} file{selected.length === 1 ? "" : "s"} (.zip)
                </button>
                <p className="mt-2 text-center text-[11px] text-neutral-600">Unzip at your repo root. Folders are included.</p>
              </div>
            </aside>

            {/* Viewer */}
            {current && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
                <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2.5">
                  <FileText className="h-4 w-4 text-neutral-500" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-neutral-300">{current.path}</p>
                    <p className="truncate text-[11px] text-neutral-500">{current.description}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="flex rounded-lg border border-white/10 p-0.5">
                      {([
                        ["preview", Eye, "Preview"],
                        ["edit", PencilLine, "Edit"],
                      ] as const).map(([id, Icon, text]) => (
                        <button
                          key={id}
                          onClick={() => setMode(id)}
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${mode === id ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
                        >
                          <Icon className="h-3.5 w-3.5" /> {text}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={copy}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-white/25 hover:text-white"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      onClick={() => downloadOne(current)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-white/25 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {mode === "preview" ? (
                  <div className="max-h-[75vh] overflow-auto px-6 py-8 sm:px-10">
                    <Preview content={stripFrontMatter(current.content)} />
                  </div>
                ) : (
                  <textarea
                    value={current.content}
                    onChange={(e) => edit(e.target.value)}
                    spellCheck={false}
                    aria-label={`Edit ${current.path}`}
                    className="h-[75vh] w-full resize-none bg-transparent p-5 font-mono text-[13px] leading-6 text-neutral-200 outline-none"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default DocsPack;
