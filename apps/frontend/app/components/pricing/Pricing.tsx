"use client";

import { FC, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";

// Free-tier limit mirrors FREE_GENERATIONS_PER_DAY in apps/backend (default 3).
const FREE_REPO_READMES = 3;

type Billing = "monthly" | "yearly";

interface Plan {
  name: string;
  tagline: string;
  price: { monthly: number; yearly: number };
  unit?: string;
  features: string[];
  cta: { label: string; href?: string };
  highlight?: boolean;
  soon?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    tagline: "Everything you need for your own repos.",
    price: { monthly: 0, yearly: 0 },
    features: [
      `${FREE_REPO_READMES} repo drafts per day (README, docs pack, changelog or diagram)`,
      "Unlimited templates, editing and section blocks",
      "Health Score with one-click fixes",
      "Badge Builder and Table Editor",
      "Converters: Docs, Notion, HTML, CSV",
    ],
    cta: { label: "Start free", href: "/generate" },
  },
  {
    name: "Pro",
    tagline: "For people who ship a lot of repos.",
    price: { monthly: 6, yearly: 60 },
    features: [
      "Unlimited repo drafts",
      "Private repositories",
      "Saved drafts across devices",
      "Priority GitHub rate limits",
    ],
    cta: { label: "Coming soon" },
    highlight: true,
    soon: true,
  },
  {
    name: "Team",
    tagline: "Consistent docs across an organization.",
    price: { monthly: 18, yearly: 180 },
    unit: "up to 5 seats",
    features: [
      "Everything in Pro",
      "Shared team templates",
      "Org-wide README health dashboard",
      "GitHub App that opens fix PRs",
      "Priority support",
    ],
    cta: { label: "Coming soon" },
    soon: true,
  },
];

type Cell = boolean | string;
const comparison: { feature: string; values: [Cell, Cell, Cell] }[] = [
  { feature: "Repo drafts (README, docs pack, changelog, diagram)", values: [`${FREE_REPO_READMES} / day`, "Unlimited", "Unlimited"] },
  { feature: "Templates, live editor and section blocks", values: [true, true, true] },
  { feature: "Health Score and one-click fixes", values: [true, true, true] },
  { feature: "Badges, tables, diagrams and converters", values: [true, true, true] },
  { feature: "Private repositories", values: [false, true, true] },
  { feature: "Saved drafts across devices", values: [false, true, true] },
  { feature: "Shared team templates", values: [false, false, true] },
  { feature: "GitHub App fix PRs", values: [false, false, true] },
];

const faqs = [
  {
    q: "What counts toward the free limit?",
    a: `Successful repo drafts (a README, docs pack, changelog or repo diagram generated from a repo), ${FREE_REPO_READMES} per day, reset at midnight UTC. Templates, blocks, badges, tables, converters, editing and Health Score checks don't count.`,
  },
  {
    q: "When do Pro and Team launch?",
    a: "They're in the works. The prices shown are what we plan to charge at launch. Until then, everything on the Free plan stays free.",
  },
  {
    q: "Do you store my README or code?",
    a: "No. MarkForge reads public repo files from GitHub to draft your README, and your drafts live in your own browser.",
  },
  {
    q: "Can I use generated READMEs commercially?",
    a: "Yes. What you generate is yours, on any plan.",
  },
];

const CellValue: FC<{ value: Cell }> = ({ value }) =>
  typeof value === "string" ? (
    <span className="text-sm text-neutral-200">{value}</span>
  ) : value ? (
    <Check className="mx-auto h-4 w-4 text-white" aria-label="Included" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-neutral-700" aria-label="Not included" />
  );

const Pricing = () => {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[520px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-12 md:px-8 md:pt-16">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
            Free to start.
            <br />
            <span className="text-neutral-500">Pro when you ship more.</span>
          </h1>
          <p className="mt-5 text-neutral-400">
            The Studio, Health Score, badges and docs pack are free. Pro lifts the daily limit on repo
            drafts and adds private repos.
          </p>

          <div className="mt-8 inline-flex items-center rounded-full border border-white/10 p-1">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  billing === b ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${billing === b ? "bg-black/10" : "bg-white/10 text-neutral-300"}`}>
                    2 months free
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const amount = plan.price[billing];
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  plan.highlight
                    ? "border-white/30 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-[0_0_80px_-20px_rgba(255,255,255,0.25)]"
                    : "border-white/10 bg-[#0a0a0a]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">{plan.name}</h2>
                  {plan.highlight ? (
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-black">Most popular</span>
                  ) : plan.soon ? (
                    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-neutral-500">Soon</span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-neutral-400">{plan.tagline}</p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-semibold tracking-tight tabular-nums">${amount}</span>
                  <span className="text-sm text-neutral-500">
                    {amount === 0 ? "forever" : billing === "monthly" ? "/ month" : "/ year"}
                  </span>
                </div>
                <p className="mt-1 h-4 text-xs text-neutral-600">
                  {plan.unit ?? (amount > 0 && billing === "yearly" ? `$${(amount / 12).toFixed(2)} / month, billed yearly` : "")}
                </p>

                {plan.cta.href ? (
                  <Link
                    href={plan.cta.href}
                    className={`group mt-6 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                      plan.highlight ? "bg-white text-black hover:bg-neutral-200" : "border border-white/15 text-white hover:border-white/30 hover:bg-white/[0.04]"
                    }`}
                  >
                    {plan.cta.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className={`mt-6 cursor-not-allowed rounded-xl py-2.5 text-sm font-medium ${
                      plan.highlight ? "bg-white/90 text-black/70" : "border border-white/10 text-neutral-500"
                    }`}
                  >
                    {plan.cta.label}
                  </button>
                )}

                <ul className="mt-7 space-y-3 border-t border-white/10 pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-center text-xs text-neutral-600">
          Pro and Team are launching soon. Prices are planned and may change before launch.
        </p>

        {/* Comparison */}
        <div className="mt-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Compare plans</h2>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0a]">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-4 text-sm font-medium text-neutral-500">Feature</th>
                  {plans.map((p) => (
                    <th key={p.name} className={`w-32 px-5 py-4 text-center text-sm font-medium ${p.highlight ? "text-white" : "text-neutral-300"}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-5 py-3.5 text-sm text-neutral-400">{row.feature}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className={`px-5 py-3.5 text-center ${plans[i].highlight ? "bg-white/[0.02]" : ""}`}>
                        <CellValue value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Questions</h2>
          <div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0a0a0a]">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {q}
                  <Plus className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
