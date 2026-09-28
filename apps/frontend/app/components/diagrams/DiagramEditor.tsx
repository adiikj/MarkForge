"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Copy, Download, Send, X } from "lucide-react";
import RepoInput from "../RepoInput";
import MermaidDiagram from "../shared/MermaidDiagram";
import QuotaNotice, { QuotaChip } from "../shared/QuotaNotice";
import { diagramTemplates } from "./diagramTemplates";
import { ApiRequestError, generateRepoDiagram, getQuota, type DiagramResult, type QuotaStatus } from "../../lib/api";
import { sendHandoff } from "../../lib/handoff";

const STORAGE_KEY = "markforge:diagram";

const DiagramEditor = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState(diagramTemplates[0].code);
  const [active, setActive] = useState<string>(diagramTemplates[0].id);
  const [svg, setSvg] = useState<string | null>(null);
  const [repoResult, setRepoResult] = useState<DiagramResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCode(saved);
        setActive("");
      }
    } catch {
      /* ignore */
    }
    setReady(true);
    getQuota().then((q) => {
      if (!q) return;
      setQuota(q);
      if (q.remaining === 0) setQuotaHit(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, [code, ready]);

  const fromRepo = async (repo: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateRepoDiagram(repo);
      setRepoResult(res);
      setQuota(res.quota);
      setCode(res.architecture);
      setActive("repo:architecture");
      router.replace(`/diagrams?repo=${encodeURIComponent(res.repo.fullName)}`, { scroll: false });
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "QUOTA_EXCEEDED") {
        setQuotaHit(true);
        setQuota((q) => (q ? { ...q, remaining: 0 } : q));
      } else setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const block = "```mermaid\n" + code.trim() + "\n```\n";

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const downloadSvg = () => {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    Object.assign(document.createElement("a"), { href: url, download: "diagram.svg" }).click();
    URL.revokeObjectURL(url);
  };

  const chip = (id: string, label: string, onClick: () => void) => (
    <button
      key={id}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
        active === id ? "bg-white text-black" : "border border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Mermaid Diagrams</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Diagrams GitHub renders natively</h1>
          <p className="mt-3 text-neutral-400">
            Write Mermaid with a live preview, start from a template, or map a repo&apos;s architecture and folder structure.
          </p>
        </div>

        <div className="mt-8 max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            Diagram a repository
            {quota && (
              <span className="ml-auto">
                <QuotaChip quota={quota} />
              </span>
            )}
          </div>
          <RepoInput onSubmit={fromRepo} loading={loading} buttonLabel="Map it" initialValue={searchParams.get("repo") ?? ""} />
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

        {/* Templates */}
        <div className="mt-8 flex flex-wrap gap-2">
          {repoResult && (
            <>
              {chip("repo:architecture", "Repo architecture", () => {
                setCode(repoResult.architecture);
                setActive("repo:architecture");
              })}
              {chip("repo:structure", "Repo structure", () => {
                setCode(repoResult.structure);
                setActive("repo:structure");
              })}
              <span className="mx-1 w-px self-stretch bg-white/10" />
            </>
          )}
          {diagramTemplates.map((t) =>
            chip(t.id, t.name, () => {
              setCode(t.code);
              setActive(t.id);
            })
          )}
        </div>

        {/* Workspace */}
        <div className="mt-4 grid overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex min-h-[420px] flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="border-b border-white/10 px-4 py-2 font-mono text-xs text-neutral-500">diagram.mmd</div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setActive("");
              }}
              spellCheck={false}
              aria-label="Mermaid source"
              className="min-h-[380px] flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-neutral-200 outline-none"
            />
          </div>
          <div className="flex min-h-[420px] flex-col bg-[#070707]">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 px-3 py-1.5">
              <span className="text-xs text-neutral-500">Preview</span>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={downloadSvg}
                  disabled={!svg}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:border-white/25 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> SVG
                </button>
                <button
                  onClick={() => {
                    sendHandoff({ append: block });
                    router.push("/generate");
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-neutral-300 hover:border-white/25"
                >
                  <Send className="h-3.5 w-3.5" /> Studio
                </button>
                <button
                  onClick={() => copy("block", block)}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200"
                >
                  {copied === "block" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "block" ? "Copied" : "Copy for README"}
                </button>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto p-6">
              <MermaidDiagram code={code} onRender={setSvg} className="w-full" />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          &ldquo;Copy for README&rdquo; wraps the diagram in a <code className="font-mono">```mermaid</code> block. GitHub renders it
          in light or dark to match each reader.
        </p>
      </div>
    </section>
  );
};

export default DiagramEditor;
