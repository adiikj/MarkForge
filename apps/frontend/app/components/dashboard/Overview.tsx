"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Files, Gauge, History, PencilLine } from "lucide-react";
import { activityInfo, Card, EmptyState, PageHeader, relativeTime, Skeleton } from "./ui";
import { ActivityBars, Meter } from "./charts";
import { dashboardApi, type Overview as OverviewData } from "../../lib/account";
import { useAuth } from "../../lib/auth";

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const untilReset = (iso: string) => {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};

const QUICK = [
  { href: "/generate", label: "Write a README", desc: "AI or quick draft from a repo", icon: PencilLine },
  { href: "/health", label: "Check README health", desc: "Score any repo out of 100", icon: Gauge },
  { href: "/docs-pack", label: "Generate a docs pack", desc: "CONTRIBUTING, SECURITY and more", icon: Files },
  { href: "/changelog", label: "Write release notes", desc: "From commits between two tags", icon: History },
];

const Overview = () => {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.overview().then(setData).catch((e) => setError(e.message));
  }, []);

  const stats = data
    ? [
        { label: "Documents", value: data.stats.documents, sub: `of ${data.limits.documents} on your plan`, href: "/dashboard/documents" },
        { label: "Tracked repos", value: data.stats.repos, sub: `of ${data.limits.repos} on your plan`, href: "/dashboard/repos" },
        {
          label: "Avg. README health",
          value: data.stats.averageScore ?? "—",
          sub: data.stats.averageScore === null ? "Track a repo to see it" : "across tracked repos",
          href: "/dashboard/repos",
        },
        { label: "Actions this week", value: data.stats.activityThisWeek, sub: "drafts, checks and saves", href: "/dashboard/activity" },
      ]
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(" ")[0] || user?.username}`}
        description="Here's what's happening with your docs."
      />

      {error && <p className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm">{error}</p>}

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats
          ? stats.map((s) => (
              <Link key={s.label} href={s.href} className="group rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 transition-colors hover:border-white/20">
                <p className="text-xs text-neutral-500">{s.label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{s.value}</p>
                <p className="mt-1 text-xs text-neutral-600 group-hover:text-neutral-400">{s.sub}</p>
              </Link>
            ))
          : [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px]" />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Activity, last 14 days" action={<Link href="/dashboard/activity" className="text-xs text-neutral-500 hover:text-white">View all</Link>}>
          {data ? <ActivityBars data={data.trend} /> : <Skeleton className="h-[140px]" />}
        </Card>
        <Card title="Today's repo drafts">
          {data ? (
            <div className="space-y-4">
              <Meter value={data.quota.used} max={data.quota.limit} label="Drafts used" />
              <p className="text-xs text-neutral-500">
                README drafts, AI drafts, docs packs, changelogs and repo diagrams share this allowance.
                {data.quota.limit !== null && <> Resets in {untilReset(data.quota.resetsAt)}.</>}
              </p>
              {user?.plan === "FREE" && (
                <Link href="/pricing" className="inline-flex items-center gap-1 text-xs text-neutral-300 hover:text-white">
                  Need more? See Pro <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ) : (
            <Skeleton className="h-24" />
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href} className="group flex items-start gap-3 rounded-2xl border border-white/10 p-4 transition-colors hover:border-white/25 hover:bg-white/[0.02]">
            <span className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
              <Icon className="h-4 w-4 text-neutral-200" />
            </span>
            <span>
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-neutral-500">{desc}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent documents" action={<Link href="/dashboard/documents" className="text-xs text-neutral-500 hover:text-white">All documents</Link>} bodyClassName="">
          {!data ? (
            <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : data.recentDocuments.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {data.recentDocuments.map((d) => (
                <li key={d.id}>
                  <Link href={`/generate?doc=${d.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02]">
                    <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{d.title}</span>
                      <span className="block truncate text-xs text-neutral-600">{d.repo ?? d.kind.toLowerCase()}</span>
                    </span>
                    <span className="shrink-0 text-xs text-neutral-600">{relativeTime(d.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FileText} title="No saved documents yet">
              Save a draft from the Studio and it shows up here, on every device.
            </EmptyState>
          )}
        </Card>

        <Card title="Recent activity" bodyClassName="">
          {!data ? (
            <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : data.recentActivity.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {data.recentActivity.map((a) => {
                const info = activityInfo(a);
                const Icon = info.icon;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{info.label}</span>
                      <span className="block truncate font-mono text-[11px] text-neutral-600">
                        {[a.repo, info.detail].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-neutral-600">{relativeTime(a.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={History} title="Nothing yet">
              Generate a README or check a repo&apos;s health and your history appears here.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Overview;
