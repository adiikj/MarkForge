"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Code2, Copy, Eye, Plus, Search, Send, X } from "lucide-react";
import RepoInput from "../RepoInput";
import Preview from "../readmegen/Preview";
import { getRepoProfile, type RepoProfile } from "../../lib/api";
import { BLOCK_CATEGORIES, blocks, type Block, type BlockCategory, type BlockContext } from "../../lib/blocks";
import { sendHandoff } from "../../lib/handoff";

const BlocksGallery = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<RepoProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<BlockCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [showCode, setShowCode] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const detect = async (repo: string) => {
    setLoading(true);
    setError(null);
    try {
      const p = await getRepoProfile(repo);
      setProfile(p);
      router.replace(`/blocks?repo=${encodeURIComponent(p.repo.fullName)}`, { scroll: false });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const repo = searchParams.get("repo");
    if (repo) detect(repo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The TOC block has no draft to read here, so give it a representative outline.
  const ctx: BlockContext = useMemo(
    () => ({
      repo: profile?.repo.fullName ?? null,
      profile,
      markdown: "## Installation\n\n## Usage\n\n## API\n\n## Contributing\n\n## License\n",
    }),
    [profile]
  );

  const q = query.trim().toLowerCase();
  const visible = blocks.filter(
    (b) => (category === "All" || b.category === category) && (!q || `${b.name} ${b.description}`.toLowerCase().includes(q))
  );
  const pickedBlocks = picked.map((id) => blocks.find((b) => b.id === id)!).filter(Boolean);
  const combined = pickedBlocks.map((b) => b.build(ctx).trim()).join("\n\n") + "\n";

  const togglePick = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleCode = (id: string) =>
    setShowCode((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const addToStudio = (list: Block[]) => {
    const anchor = list.find((b) => b.topAnchor)?.topAnchor;
    sendHandoff({
      append: list.map((b) => b.build(ctx).trim()).join("\n\n"),
      topAnchor: anchor,
      repo: profile?.repo.fullName,
    });
    router.push("/generate");
  };

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-32 pt-10 md:px-8 md:pt-14">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Section Blocks</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Ready-made README sections</h1>
          <p className="mt-3 text-neutral-400">
            {blocks.length} blocks for installs, API tables, FAQs, screenshots, contributors and more. Detect a repo to fill
            them in with your stack, env vars and license.
          </p>
        </div>

        <div className="mt-8 max-w-2xl">
          <RepoInput onSubmit={detect} loading={loading} buttonLabel="Fill in" initialValue={searchParams.get("repo") ?? ""} />
          {profile && (
            <p className="mt-2 text-xs text-neutral-500">
              Using details from <span className="font-mono text-neutral-300">{profile.repo.fullName}</span>
            </p>
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
        </div>

        {/* Filters */}
        <div className="mt-10 flex flex-wrap items-center gap-2">
          {(["All", ...BLOCK_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                category === c ? "bg-white text-black" : "border border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
          <div className="ml-auto flex w-full items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 focus-within:border-white/25 sm:w-56">
            <Search className="h-3.5 w-3.5 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search blocks"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((b) => {
            const md = b.build(ctx).trim();
            const on = picked.includes(b.id);
            const code = showCode.has(b.id);
            return (
              <div
                key={b.id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-[#0a0a0a] transition-colors ${on ? "border-white/40" : "border-white/10"}`}
              >
                <div className="flex items-start gap-3 border-b border-white/10 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {b.name}
                      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">{b.category}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">{b.description}</p>
                  </div>
                  <button
                    onClick={() => togglePick(b.id)}
                    aria-pressed={on}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      on ? "bg-white text-black" : "border border-white/15 text-neutral-300 hover:border-white/30"
                    }`}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {on ? "Picked" : "Pick"}
                  </button>
                </div>

                <div className="relative h-56 overflow-hidden">
                  {code ? (
                    <pre className="h-full overflow-auto p-4 font-mono text-[11.5px] leading-5 text-neutral-300">{md}</pre>
                  ) : (
                    <>
                      <div className="pointer-events-none origin-top-left scale-[0.8] p-5 [width:125%]">
                        <Preview content={md} />
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                    </>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-1.5 border-t border-white/10 px-3 py-2">
                  <button
                    onClick={() => toggleCode(b.id)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    {code ? <Eye className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                    {code ? "Preview" : "Markdown"}
                  </button>
                  <button
                    onClick={() => copy(b.id, md + "\n")}
                    className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    {copied === b.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === b.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => addToStudio([b])}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    <Send className="h-3.5 w-3.5" /> Studio
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {!visible.length && <p className="mt-10 text-center text-sm text-neutral-600">No blocks match your search.</p>}
      </div>

      {/* Selection bar */}
      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-5">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/15 bg-[#0d0d0d]/95 px-4 py-3 shadow-2xl shadow-black backdrop-blur-xl">
            <span className="text-sm">
              <span className="font-medium">{picked.length}</span>
              <span className="text-neutral-400"> block{picked.length > 1 ? "s" : ""} picked</span>
            </span>
            <button onClick={() => setPicked([])} className="text-xs text-neutral-500 hover:text-white">
              Clear
            </button>
            <button
              onClick={() => copy("__all", combined)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:border-white/30"
            >
              {copied === "__all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "__all" ? "Copied" : "Copy all"}
            </button>
            <button
              onClick={() => addToStudio(pickedBlocks)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200"
            >
              <Send className="h-3.5 w-3.5" /> Add to Studio
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default BlocksGallery;
