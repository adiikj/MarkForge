"use client";

import { FC, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Github,
  Loader2,
  Minus,
  PencilLine,
  Wand2,
  X,
} from "lucide-react";
import RepoInput from "../RepoInput";
import ScoreRing from "./ScoreRing";
import { checkHealth, type Check as HealthCheck, type CheckCategory, type HealthResult } from "../../lib/api";
import { applyFix } from "../../lib/applyFix";
import { sendHandoff, takeHandoff } from "../../lib/handoff";

type Mode = "repo" | "paste";
type Kind = "project" | "profile";

const CATEGORIES: { id: CheckCategory; title: string }[] = [
  { id: "essentials", title: "Essentials" },
  { id: "links", title: "Links & media" },
  { id: "structure", title: "Structure" },
  { id: "polish", title: "Polish" },
];

const StatusIcon: FC<{ status: HealthCheck["status"] }> = ({ status }) => {
  if (status === "pass") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-neutral-400">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/50 text-white">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-black">
      <X className="h-3 w-3" strokeWidth={3} />
    </span>
  );
};

const HealthChecker = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("repo");
  const [pasteText, setPasteText] = useState("");
  const [kind, setKind] = useState<Kind>("project");
  const [result, setResult] = useState<HealthResult | null>(null);
  const [working, setWorking] = useState("");
  const [firstScore, setFirstScore] = useState<number | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [label, setLabel] = useState<string | null>(null);

  const repoName = result?.repo?.fullName;

  const run = async (input: Parameters<typeof checkHealth>[0], docLabel: string | null = null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await checkHealth(input);
      setResult(res);
      setWorking(res.markdown ?? "");
      setFirstScore(res.report?.score ?? null);
      setApplied(new Set());
      setLabel(docLabel ?? res.repo?.fullName ?? null);
      if (res.repo) router.replace(`/health?repo=${encodeURIComponent(res.repo.fullName)}`, { scroll: false });
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Arrivals: from the Studio (handoff) or a shared ?repo= link.
  useEffect(() => {
    const handoff = takeHandoff();
    const repoParam = searchParams.get("repo");
    if (handoff?.markdown) {
      setMode(handoff.repo ? "repo" : "paste");
      if (!handoff.repo) setPasteText(handoff.markdown);
      run(handoff.repo ? { repo: handoff.repo, markdown: handoff.markdown } : { markdown: handoff.markdown, kind: "project" }, handoff.label ?? null);
    } else if (repoParam) {
      run({ repo: repoParam });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rescore = async (markdown: string) => {
    setRescoring(true);
    try {
      const res = await checkHealth(repoName ? { repo: repoName, markdown } : { markdown, kind });
      setResult((prev) => (prev ? { ...prev, report: res.report } : res));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRescoring(false);
    }
  };

  const fixOne = (check: HealthCheck) => {
    if (!check.fix) return;
    const next = applyFix(working, check.fix.ops);
    setWorking(next);
    setApplied((s) => new Set(s).add(check.id));
    rescore(next);
  };

  const fixable = result?.report?.checks.filter((c) => c.fix && c.status !== "pass" && !applied.has(c.id)) ?? [];

  const fixAll = () => {
    const next = fixable.reduce((md, c) => applyFix(md, c.fix!.ops), working);
    setWorking(next);
    setApplied((s) => new Set([...s, ...fixable.map((c) => c.id)]));
    rescore(next);
  };

  const openInStudio = () => {
    sendHandoff({ markdown: working, label: label ?? "README.md", repo: repoName });
    router.push("/generate");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(working);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const report = result?.report;
  const delta = report && firstScore !== null ? report.score - firstScore : 0;

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        {/* Heading + input */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Health Score</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">How good is your README?</h1>
          <p className="mt-3 text-neutral-400">
            Up to 15 weighted checks for missing sections, broken links, accessibility and polish. Most issues fix in one click.
          </p>

          <div className="mt-8 inline-flex rounded-xl border border-white/10 p-1">
            {([
              ["repo", Github, "Repo link"],
              ["paste", ClipboardPaste, "Paste Markdown"],
            ] as const).map(([id, Icon, text]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                  mode === id ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {text}
              </button>
            ))}
          </div>

          <div className="mt-4 text-left">
            {mode === "repo" ? (
              <RepoInput
                onSubmit={(repo) => run({ repo })}
                loading={loading}
                buttonLabel="Check"
                initialValue={searchParams.get("repo") ?? ""}
                autoFocus
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 transition-colors focus-within:border-white/30">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="# Paste your README here…"
                  spellCheck={false}
                  className="h-44 w-full resize-y bg-transparent p-3 font-mono text-[13px] leading-6 text-neutral-200 outline-none placeholder:text-neutral-600"
                />
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-1.5 pt-2.5">
                  <span className="pl-2 text-xs text-neutral-500">This is a</span>
                  <div className="flex rounded-lg border border-white/10 p-0.5">
                    {(["project", "profile"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => setKind(k)}
                        className={`rounded-md px-2.5 py-1 text-xs capitalize ${kind === k ? "bg-white/15 text-white" : "text-neutral-500 hover:text-white"}`}
                      >
                        {k} README
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => run({ markdown: pasteText, kind })}
                    disabled={loading || !pasteText.trim()}
                    className="ml-auto flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Check
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-left text-sm text-neutral-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} aria-label="Dismiss" className="text-neutral-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="scroll-mt-24">
          {result && !report && (
            <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 text-center">
              <p className="text-lg font-medium">{repoName} has no README yet.</p>
              <p className="mt-2 text-sm text-neutral-400">That&apos;s a score of zero, but it&apos;s the easiest one to fix.</p>
              <Link
                href={`/generate?repo=${encodeURIComponent(repoName ?? "")}`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
              >
                Generate one from the code <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {report && (
            <div className="mt-14 grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
              {/* Score card */}
              <aside className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 lg:sticky lg:top-24">
                <div className="flex items-center gap-5 lg:flex-col lg:items-start">
                  <div className="relative">
                    <ScoreRing score={report.score} />
                    {rescoring && (
                      <Loader2 className="absolute -right-1 -top-1 h-4 w-4 animate-spin text-neutral-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white px-2 py-0.5 font-mono text-sm font-semibold text-black">{report.grade}</span>
                      {delta !== 0 && (
                        <span className="font-mono text-xs text-neutral-300">
                          {delta > 0 ? "+" : ""}
                          {delta} from fixes
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-lg font-medium leading-snug">{report.verdict}</p>
                    {result?.repo ? (
                      <a
                        href={result.repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-neutral-500 hover:text-white"
                      >
                        {result.repo.fullName}/{result.readmePath} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      label && <p className="mt-1 truncate font-mono text-xs text-neutral-500">{label}</p>
                    )}
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
                  {([
                    ["Words", report.stats.words],
                    ["Sections", report.stats.headings],
                    ["Images", report.stats.images],
                  ] as const).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[11px] text-neutral-500">{k}</dt>
                      <dd className="mt-0.5 font-mono text-sm tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 space-y-2">
                  {fixable.length > 0 && (
                    <button
                      onClick={fixAll}
                      disabled={rescoring}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
                    >
                      <Wand2 className="h-4 w-4" /> Apply {fixable.length} fix{fixable.length > 1 ? "es" : ""}
                    </button>
                  )}
                  <button
                    onClick={openInStudio}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm text-neutral-200 hover:border-white/30 hover:bg-white/[0.04]"
                  >
                    <PencilLine className="h-4 w-4" /> Open in Studio
                  </button>
                  {applied.size > 0 && (
                    <button
                      onClick={copy}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs text-neutral-400 hover:text-white"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy fixed README"}
                    </button>
                  )}
                </div>
              </aside>

              {/* Checks */}
              <div className="space-y-6">
                {CATEGORIES.map(({ id, title }) => {
                  const checks = report.checks.filter((c) => c.category === id);
                  if (!checks.length) return null;
                  const passed = checks.filter((c) => c.status === "pass").length;
                  return (
                    <div key={id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
                      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                        <h2 className="text-sm font-medium">{title}</h2>
                        <span className="font-mono text-xs text-neutral-500">
                          {passed}/{checks.length} passed
                        </span>
                      </div>
                      <ul className="divide-y divide-white/[0.06]">
                        {checks.map((c) => (
                          <li key={c.id} className="flex gap-3 px-5 py-4">
                            <div className="pt-0.5">
                              <StatusIcon status={c.status} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <p className={`text-sm font-medium ${c.status === "pass" ? "text-neutral-400" : "text-white"}`}>{c.label}</p>
                                <span className="font-mono text-[10px] text-neutral-600">{c.weight} pts</span>
                              </div>
                              <p className="mt-0.5 text-sm text-neutral-500">{c.detail}</p>
                              {c.items && c.items.length > 0 && c.status !== "pass" && (
                                <ul className="mt-2 space-y-1">
                                  {c.items.map((item) => (
                                    <li key={item} className="truncate rounded-md bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-neutral-400">
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {c.fix && c.status !== "pass" && (
                              <div className="shrink-0">
                                {applied.has(c.id) ? (
                                  <span className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-neutral-500">
                                    <Check className="h-3.5 w-3.5" /> Applied
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => fixOne(c)}
                                    disabled={rescoring}
                                    className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-neutral-200 transition-colors hover:border-white/40 hover:bg-white/[0.05] disabled:opacity-50"
                                  >
                                    <Wand2 className="h-3.5 w-3.5" /> {c.fix.label}
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {applied.size > 0 && (
                  <p className="text-center text-xs text-neutral-500">
                    Fixes are applied to a working copy. Open it in the Studio to review, then download.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HealthChecker;
