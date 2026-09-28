import { FC } from "react";
import Link from "next/link";
import { Check, AlertTriangle, Wand2, ArrowRight } from "lucide-react";

const SCORE = 82;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const checks: { ok: boolean; label: string; detail: string }[] = [
  { ok: true, label: "Install instructions", detail: "Found under ## Getting Started" },
  { ok: true, label: "License section", detail: "MIT, matches LICENSE file" },
  { ok: false, label: "2 broken links", detail: "docs/setup.md, /wiki/FAQ" },
  { ok: false, label: "Images missing alt text", detail: "3 of 5 images" },
  { ok: true, label: "Heading hierarchy", detail: "No skipped levels" },
];

const HealthScore: FC = () => {
  return (
    <section id="health" className="scroll-mt-20 border-y border-white/[0.06] bg-white/[0.015] py-24 text-white md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 md:grid-cols-2 md:px-8">
        {/* Copy */}
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Health Score</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            How good is
            <br />
            your README?
          </h2>
          <p className="mt-5 max-w-md text-neutral-400">
            Paste any repo link and get a score out of 100. MarkForge checks for missing
            sections, broken links, leftover TODOs and accessibility gaps, then fixes them
            in one click.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-neutral-300">
            {["15 weighted checks, from install steps to alt text", "One-click fixes, re-scored instantly", "Works on any public repo, or paste Markdown"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <Check className="h-3 w-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/health"
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
          >
            Check your README
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Report card mockup */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-white/[0.04] blur-3xl" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 shadow-2xl shadow-black md:p-8">
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32 shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - SCORE / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-semibold tabular-nums">{SCORE}</span>
                  <span className="text-[10px] uppercase tracking-widest text-neutral-500">/ 100</span>
                </div>
              </div>
              <div>
                <p className="font-mono text-xs text-neutral-500">you/awesome-project</p>
                <p className="mt-1 text-xl font-medium">Solid, with a few gaps</p>
                <p className="mt-1 text-sm text-neutral-400">3 passed · 2 to fix</p>
              </div>
            </div>

            <div className="mt-7 divide-y divide-white/[0.06] rounded-xl border border-white/10">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-3 px-4 py-3">
                  {c.ok ? (
                    <Check className="h-4 w-4 shrink-0 text-neutral-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${c.ok ? "text-neutral-400" : "text-white"}`}>{c.label}</p>
                    <p className="truncate text-xs text-neutral-600">{c.detail}</p>
                  </div>
                  {!c.ok && (
                    <span className="flex shrink-0 items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-neutral-300">
                      <Wand2 className="h-3 w-3" /> Fix
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HealthScore;
