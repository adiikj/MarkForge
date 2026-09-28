"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Check, Copy, Plus, Search, Send, X } from "lucide-react";
import RepoInput from "../RepoInput";
import { getRepoProfile, type RepoProfile } from "../../lib/api";
import {
  BADGE_GROUPS,
  TECH_LOGOS,
  buildCatalog,
  customBadge,
  techBadge,
  toHtml,
  toMarkdown,
  type Badge,
  type BadgeStyle,
} from "../../lib/badges";
import { sendHandoff } from "../../lib/handoff";

const STYLES: BadgeStyle[] = ["flat", "flat-square", "for-the-badge", "plastic", "social"];
const TECH_COLORS = [
  { name: "Black", hex: "000000" },
  { name: "Graphite", hex: "262626" },
  { name: "Blue", hex: "2563eb" },
  { name: "Green", hex: "16a34a" },
];
const CUSTOM_COLORS = ["000000", "555555", "2563eb", "16a34a", "ca8a04", "dc2626", "9333ea"];

// Sensible first picks once a repo is detected.
const DEFAULT_PICKS = ["license", "stars", "last-commit", "npm-v", "pypi-v", "crate", "gopkg"];

const BadgeBuilder = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<RepoProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<BadgeStyle>("flat-square");
  const [techColor, setTechColor] = useState("000000");
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const [align, setAlign] = useState<"left" | "center">("left");
  const [selected, setSelected] = useState<string[]>([]);
  const [extraTech, setExtraTech] = useState<string[]>([]);
  const [techQuery, setTechQuery] = useState("");
  const [customs, setCustoms] = useState<Badge[]>([]);
  const [draft, setDraft] = useState({ label: "", message: "", color: "2563eb", logo: "", link: "" });
  const [copied, setCopied] = useState(false);

  const detect = async (repo: string) => {
    setLoading(true);
    setError(null);
    try {
      const p = await getRepoProfile(repo);
      setProfile(p);
      const ci = p.ciWorkflows[0] ? [`ci:${p.ciWorkflows[0]}`] : [];
      setSelected((prev) => [...new Set([...ci, ...DEFAULT_PICKS, ...prev])]);
      router.replace(`/badges?repo=${encodeURIComponent(p.repo.fullName)}`, { scroll: false });
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

  const catalog = useMemo(() => {
    const base = buildCatalog(profile, style, techColor);
    const detectedTech = new Set(profile?.stack ?? []);
    const extras = extraTech.filter((t) => !detectedTech.has(t)).map((t) => techBadge(t, style, techColor));
    const restyledCustoms = customs.map((c) => {
      const u = new URL(c.image);
      u.searchParams.set("style", style);
      return { ...c, image: u.toString() };
    });
    return [...base, ...extras, ...restyledCustoms];
  }, [profile, style, techColor, extraTech, customs]);

  const byId = useMemo(() => new Map(catalog.map((b) => [b.id, b])), [catalog]);
  const chosen = selected.map((id) => byId.get(id)).filter(Boolean) as Badge[];
  const output = format === "markdown" ? toMarkdown(chosen) : toHtml(chosen, align);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addTech = (name: string) => {
    setExtraTech((t) => (t.includes(name) ? t : [...t, name]));
    setSelected((s) => (s.includes(`tech:${name}`) ? s : [...s, `tech:${name}`]));
    setTechQuery("");
  };

  const addCustom = () => {
    if (!draft.message.trim() && !draft.label.trim()) return;
    const b = customBadge(draft, style);
    setCustoms((c) => [...c.filter((x) => x.id !== b.id), b]);
    setSelected((s) => (s.includes(b.id) ? s : [...s, b.id]));
    setDraft((d) => ({ ...d, label: "", message: "", logo: "", link: "" }));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const sendToStudio = () => {
    sendHandoff({ insertAfterTitle: output, repo: profile?.repo.fullName });
    router.push("/generate");
  };

  const techMatches = techQuery.trim()
    ? Object.keys(TECH_LOGOS)
        .filter((t) => t.toLowerCase().includes(techQuery.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Badge Builder</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Badges that fit your repo</h1>
          <p className="mt-3 text-neutral-400">
            Paste a repo and MarkForge finds the badges that apply: CI, registry, license and stack. Or build your own.
          </p>
        </div>

        <div className="mt-8 max-w-2xl">
          <RepoInput onSubmit={detect} loading={loading} buttonLabel="Detect" initialValue={searchParams.get("repo") ?? ""} />
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

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* Picker */}
          <div className="space-y-5">
            {/* Style controls */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-white/10 bg-[#0a0a0a] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500">Style</span>
                <div className="flex flex-wrap rounded-lg border border-white/10 p-0.5">
                  {STYLES.map((st) => (
                    <button
                      key={st}
                      onClick={() => setStyle(st)}
                      className={`rounded-md px-2.5 py-1 font-mono text-[11px] ${style === st ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Stack color</span>
                {TECH_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setTechColor(c.hex)}
                    title={c.name}
                    aria-label={`Stack badge color ${c.name}`}
                    className={`h-5 w-5 rounded-full border ${techColor === c.hex ? "border-white ring-2 ring-white/30" : "border-white/20"}`}
                    style={{ background: `#${c.hex}` }}
                  />
                ))}
              </div>
            </div>

            {!profile && (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-neutral-500">
                Detect a repo to unlock CI, package and repository badges. Community, stack and custom badges work without one.
              </p>
            )}

            {BADGE_GROUPS.map((group) => {
              const items = catalog.filter((b) => b.group === group && !b.id.startsWith("custom:"));
              if (!items.length && group !== "Tech stack") return null;
              return (
                <div key={group} className="rounded-2xl border border-white/10 bg-[#0a0a0a]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                    <h2 className="text-sm font-medium">{group}</h2>
                    <span className="font-mono text-[11px] text-neutral-600">
                      {items.filter((b) => selected.includes(b.id)).length}/{items.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4">
                    {items.map((b) => {
                      const on = selected.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          onClick={() => toggle(b.id)}
                          aria-pressed={on}
                          className={`group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                            on ? "border-white/40 bg-white/[0.07]" : "border-white/10 hover:border-white/25"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              on ? "border-white bg-white text-black" : "border-white/25"
                            }`}
                          >
                            {on && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={b.image} alt={b.alt} className="h-5 max-w-[180px]" loading="lazy" />
                          <span className="hidden text-xs text-neutral-500 sm:inline">{b.name}</span>
                        </button>
                      );
                    })}
                    {group === "Tech stack" && (
                      <div className="relative">
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/15 px-2.5 py-2 focus-within:border-white/30">
                          <Search className="h-3.5 w-3.5 text-neutral-500" />
                          <input
                            value={techQuery}
                            onChange={(e) => setTechQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && techMatches[0] && addTech(techMatches[0])}
                            placeholder="Add a technology…"
                            className="w-40 bg-transparent text-xs text-white outline-none placeholder:text-neutral-600"
                          />
                        </div>
                        {techMatches.length > 0 && (
                          <div className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-lg border border-white/15 bg-[#111] shadow-xl">
                            {techMatches.map((t) => (
                              <button key={t} onClick={() => addTech(t)} className="block w-full px-3 py-1.5 text-left text-xs text-neutral-300 hover:bg-white/10">
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Custom */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]">
              <div className="border-b border-white/10 px-4 py-2.5">
                <h2 className="text-sm font-medium">Custom badge</h2>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {([
                  ["label", "Label", "version"],
                  ["message", "Message", "1.0.0"],
                  ["logo", "Logo (simple-icons slug)", "github"],
                  ["link", "Link (optional)", "https://…"],
                ] as const).map(([key, text, ph]) => (
                  <label key={key} className="block">
                    <span className="text-xs text-neutral-500">{text}</span>
                    <input
                      value={draft[key]}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      placeholder={ph}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-neutral-700 focus:border-white/30"
                    />
                  </label>
                ))}
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <span className="text-xs text-neutral-500">Color</span>
                  {CUSTOM_COLORS.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setDraft((d) => ({ ...d, color: hex }))}
                      aria-label={`Color #${hex}`}
                      className={`h-5 w-5 rounded-full border ${draft.color === hex ? "border-white ring-2 ring-white/30" : "border-white/20"}`}
                      style={{ background: `#${hex}` }}
                    />
                  ))}
                  <div className="ml-auto flex items-center gap-3">
                    {(draft.label || draft.message) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={customBadge(draft, style).image} alt="Custom badge preview" className="h-5" />
                    )}
                    <button
                      onClick={addCustom}
                      disabled={!draft.label.trim() && !draft.message.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
                {customs.length > 0 && (
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {customs.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${selected.includes(c.id) ? "border-white/40 bg-white/[0.07]" : "border-white/10"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.image} alt={c.alt} className="h-5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Output */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <h2 className="text-sm font-medium">Preview</h2>
                {chosen.length > 0 && (
                  <button onClick={() => setSelected([])} className="text-xs text-neutral-500 hover:text-white">
                    Clear
                  </button>
                )}
              </div>
              <div className={`flex min-h-24 flex-wrap items-center gap-1.5 p-5 ${align === "center" && format === "html" ? "justify-center" : ""}`}>
                {chosen.length ? (
                  chosen.map((b) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={b.id} src={b.image} alt={b.alt} className="h-5 max-w-full" />
                  ))
                ) : (
                  <p className="text-sm text-neutral-600">Pick badges on the left.</p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                <div className="flex rounded-lg border border-white/10 p-0.5">
                  {(["markdown", "html"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`rounded-md px-2.5 py-1 text-xs ${format === f ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
                    >
                      {f === "markdown" ? "Markdown" : "HTML"}
                    </button>
                  ))}
                </div>
                {format === "html" && (
                  <div className="flex rounded-lg border border-white/10 p-0.5">
                    {(["left", "center"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setAlign(a)}
                        className={`rounded-md px-2.5 py-1 text-xs capitalize ${align === a ? "bg-white/15 text-white" : "text-neutral-500 hover:text-white"}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
                <span className="ml-auto font-mono text-[11px] text-neutral-600">{chosen.length} badges</span>
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[11.5px] leading-5 text-neutral-300">
                {chosen.length ? output : <span className="text-neutral-700">Your badge code appears here.</span>}
              </pre>
              <div className="flex gap-2 border-t border-white/10 p-3">
                <button
                  onClick={copy}
                  disabled={!chosen.length}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={sendToStudio}
                  disabled={!chosen.length}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 py-2 text-sm text-neutral-200 hover:border-white/30 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" /> Add to Studio draft
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default BadgeBuilder;
