"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Check, Copy, Download, Eye, Loader2, Send, X } from "lucide-react";
import RepoInput from "../RepoInput";
import Preview from "../readmegen/Preview";
import QuotaNotice, { QuotaChip } from "../shared/QuotaNotice";
import {
  ApiRequestError,
  generateChangelog,
  getChangelogRefs,
  getQuota,
  type ChangeEntry,
  type ChangeKind,
  type ChangelogRefs,
  type ChangelogResult,
  type QuotaStatus,
} from "../../lib/api";
import { sendHandoff } from "../../lib/handoff";

type Format = "keepachangelog" | "release";

const SECTIONS: { kind: ChangeKind; kac: string; release: string }[] = [
  { kind: "breaking", kac: "⚠️ Breaking changes", release: "⚠️ Breaking changes" },
  { kind: "added", kac: "Added", release: "New features" },
  { kind: "changed", kac: "Changed", release: "Improvements" },
  { kind: "performance", kac: "Performance", release: "Performance" },
  { kind: "deprecated", kac: "Deprecated", release: "Deprecations" },
  { kind: "removed", kac: "Removed", release: "Removed" },
  { kind: "fixed", kac: "Fixed", release: "Bug fixes" },
  { kind: "security", kac: "Security", release: "Security" },
  { kind: "docs", kac: "Documentation", release: "Documentation" },
  { kind: "other", kac: "Other", release: "Other changes" },
];

const FROM_START = "__start__";

const ChangelogGenerator = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [refs, setRefs] = useState<ChangelogRefs | null>(null);
  const [from, setFrom] = useState(FROM_START);
  const [to, setTo] = useState("");
  const [result, setResult] = useState<ChangelogResult | null>(null);
  const [entries, setEntries] = useState<(ChangeEntry & { include: boolean })[]>([]);
  const [format, setFormat] = useState<Format>("keepachangelog");
  const [version, setVersion] = useState("Unreleased");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showAuthors, setShowAuthors] = useState(true);
  const [showNoise, setShowNoise] = useState(false);
  const [view, setView] = useState<"preview" | "markdown">("preview");
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [loading, setLoading] = useState(false);
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
    const repo = searchParams.get("repo");
    if (repo) loadRefs(repo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRefs = async (repo: string) => {
    setLoadingRefs(true);
    setError(null);
    setResult(null);
    try {
      const r = await getChangelogRefs(repo);
      setRefs(r);
      setFrom(r.tags[0] ?? FROM_START);
      setTo(r.defaultBranch);
      setVersion("Unreleased");
      router.replace(`/changelog?repo=${encodeURIComponent(r.fullName)}`, { scroll: false });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingRefs(false);
    }
  };

  const generate = async () => {
    if (!refs) return;
    setLoading(true);
    setError(null);
    try {
      const res = await generateChangelog(refs.fullName, from === FROM_START ? null : from, to);
      setResult(res);
      setEntries(res.entries.map((e) => ({ ...e, include: true })));
      setQuota(res.quota);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "QUOTA_EXCEEDED") {
        setQuotaHit(true);
        setQuota((q) => (q ? { ...q, remaining: 0 } : q));
      } else setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const visible = entries.filter((e) => showNoise || !e.noise);

  const markdown = useMemo(() => {
    if (!result) return "";
    const base = result.repo.htmlUrl;
    const chosen = visible.filter((e) => e.include);
    const item = (e: ChangeEntry) => {
      const scope = e.scope ? `**${e.scope}:** ` : "";
      const ref = e.pr ? `[#${e.pr}](${base}/pull/${e.pr})` : `[\`${e.sha.slice(0, 7)}\`](${e.url})`;
      if (format === "release") {
        return `- ${scope}${e.subject}${showAuthors && e.author ? ` by @${e.author}` : ""} in ${ref}`;
      }
      return `- ${scope}${e.subject} (${ref})${showAuthors && e.author ? ` by @${e.author}` : ""}`;
    };
    const sections = SECTIONS.map((s) => ({ s, items: chosen.filter((e) => e.kind === s.kind) })).filter((x) => x.items.length);
    const compare = result.from ? `${base}/compare/${result.from}...${result.to}` : `${base}/commits/${result.to}`;

    if (format === "release") {
      return [
        "## What's Changed",
        "",
        ...sections.flatMap(({ s, items }) => [`### ${s.release}`, "", ...items.map(item), ""]),
        `**Full Changelog**: ${compare}`,
        "",
      ].join("\n");
    }
    const heading = version === "Unreleased" ? "## [Unreleased]" : `## [${version.replace(/^v/, "")}] - ${date}`;
    const label = version === "Unreleased" ? "Unreleased" : version.replace(/^v/, "");
    return [
      heading,
      "",
      ...sections.flatMap(({ s, items }) => [`### ${s.kac}`, "", ...items.map(item), ""]),
      `[${label}]: ${compare}`,
      "",
    ].join("\n");
  }, [result, visible, format, showAuthors, version, date]);

  const setEntry = (sha: string, patch: Partial<ChangeEntry & { include: boolean }>) =>
    setEntries((es) => es.map((e) => (e.sha === sha ? { ...e, ...patch } : e)));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    Object.assign(document.createElement("a"), { href: url, download: format === "release" ? "RELEASE_NOTES.md" : "CHANGELOG.md" }).click();
    URL.revokeObjectURL(url);
  };

  const selectCls = "w-full rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white outline-none focus:border-white/30";

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Changelog Generator</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Release notes from your commits</h1>
          <p className="mt-3 text-neutral-400">
            Pick two tags. MarkForge groups the commits and PRs between them into features, fixes and breaking changes, reading
            Conventional Commits when you use them.
          </p>
        </div>

        <div className="mt-8 max-w-2xl space-y-3">
          <RepoInput onSubmit={loadRefs} loading={loadingRefs} buttonLabel="Load tags" initialValue={searchParams.get("repo") ?? ""} />
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

        {refs && (
          <div className="mt-6 max-w-3xl rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-neutral-400">{refs.fullName}</p>
              <span className="text-xs text-neutral-600">· {refs.tags.length} tags</span>
              {quota && (
                <span className="ml-auto">
                  <QuotaChip remaining={quota.remaining} limit={quota.limit} />
                </span>
              )}
            </div>
            <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <label className="block">
                <span className="text-xs text-neutral-500">From</span>
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={`mt-1 ${selectCls}`}>
                  <option value={FROM_START}>Latest 100 commits</option>
                  {refs.tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <ArrowRight className="mb-2.5 hidden h-4 w-4 text-neutral-600 sm:block" />
              <label className="block">
                <span className="text-xs text-neutral-500">To</span>
                <select
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setVersion(e.target.value === refs.defaultBranch ? "Unreleased" : e.target.value);
                  }}
                  className={`mt-1 ${selectCls}`}
                >
                  <option value={refs.defaultBranch}>{refs.defaultBranch} (latest)</option>
                  {refs.tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!refs.tags.length && <p className="mt-3 text-xs text-neutral-500">No tags yet. Using the latest 100 commits on {refs.defaultBranch}.</p>}
            <button
              onClick={generate}
              disabled={loading || from === to}
              className="mt-4 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Generate changelog
            </button>
            {quotaHit && !loading && (
              <div className="mt-3">
                <QuotaNotice />
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* Entries */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
                <p className="text-sm font-medium">
                  {visible.filter((e) => e.include).length} of {visible.length} changes
                </p>
                <span className="font-mono text-[11px] text-neutral-600">
                  {result.commitCount} commits{result.truncated ? " (capped)" : ""}
                </span>
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                  <input type="checkbox" checked={showNoise} onChange={(e) => setShowNoise(e.target.checked)} className="accent-white" />
                  Show chores & deps
                </label>
              </div>
              {visible.length === 0 ? (
                <p className="p-6 text-sm text-neutral-500">No changes in this range.</p>
              ) : (
                <ul className="max-h-[70vh] divide-y divide-white/[0.06] overflow-auto">
                  {visible.map((e) => (
                    <li key={e.sha} className="flex items-start gap-3 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={e.include}
                        onChange={(ev) => setEntry(e.sha, { include: ev.target.checked })}
                        aria-label={`Include ${e.subject}`}
                        className="mt-1 accent-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${e.include ? "text-neutral-200" : "text-neutral-600 line-through"}`}>
                          {e.scope && <span className="text-neutral-500">{e.scope}: </span>}
                          {e.subject}
                        </p>
                        <p className="font-mono text-[11px] text-neutral-600">
                          {e.pr ? `#${e.pr}` : e.sha.slice(0, 7)}
                          {e.author ? ` · @${e.author}` : ""}
                        </p>
                      </div>
                      <select
                        value={e.kind}
                        onChange={(ev) => setEntry(e.sha, { kind: ev.target.value as ChangeKind })}
                        aria-label="Section"
                        className="shrink-0 rounded-md border border-white/10 bg-[#0d0d0d] px-1.5 py-1 text-[11px] text-neutral-300 outline-none"
                      >
                        {SECTIONS.map((s) => (
                          <option key={s.kind} value={s.kind}>
                            {s.kac.replace("⚠️ ", "")}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Output */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] lg:sticky lg:top-24">
              <div className="space-y-3 border-b border-white/10 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg border border-white/10 p-0.5">
                    {([
                      ["keepachangelog", "CHANGELOG.md"],
                      ["release", "Release notes"],
                    ] as const).map(([f, label]) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={`rounded-md px-2.5 py-1 text-xs ${format === f ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                    <input type="checkbox" checked={showAuthors} onChange={(e) => setShowAuthors(e.target.checked)} className="accent-white" />
                    Authors
                  </label>
                </div>
                {format === "keepachangelog" && (
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <span className="text-[11px] text-neutral-500">Version</span>
                      <input value={version} onChange={(e) => setVersion(e.target.value)} className={`mt-1 ${selectCls} py-1.5`} />
                    </label>
                    <label className="w-40">
                      <span className="text-[11px] text-neutral-500">Date</span>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${selectCls} py-1.5 [color-scheme:dark]`} />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                <div className="flex rounded-lg border border-white/10 p-0.5">
                  {(["preview", "markdown"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${view === v ? "bg-white/15 text-white" : "text-neutral-500 hover:text-white"}`}
                    >
                      {v === "preview" && <Eye className="h-3.5 w-3.5" />}
                      {v === "preview" ? "Preview" : "Markdown"}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={download} className="rounded-lg border border-white/10 p-1.5 text-neutral-300 hover:border-white/25" aria-label="Download">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      sendHandoff({ markdown, label: format === "release" ? "RELEASE_NOTES.md" : "CHANGELOG.md", repo: result.repo.fullName });
                      router.push("/generate");
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-white/25"
                  >
                    <Send className="h-3.5 w-3.5" /> Studio
                  </button>
                  <button onClick={copy} className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-black hover:bg-neutral-200">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                {view === "preview" ? (
                  <div className="p-6">
                    <Preview content={markdown} />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap p-5 font-mono text-[12px] leading-5 text-neutral-300">{markdown}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ChangelogGenerator;
