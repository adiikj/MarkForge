"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, History, Loader2 } from "lucide-react";
import { ACTIVITY_FILTERS, activityInfo, btn, EmptyState, PageHeader, Skeleton } from "./ui";
import { dashboardApi, type Activity } from "../../lib/account";
import { useToast } from "../../lib/toast";

const dayHeading = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};

const ActivityFeed = () => {
  const toast = useToast();
  const [type, setType] = useState("");
  const [items, setItems] = useState<Activity[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (t: string, after: string | null) => {
      try {
        const page = await dashboardApi.activity(after, t);
        setItems((prev) => (after && prev ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
      } catch (err) {
        toast((err as Error).message, "error");
        setItems((prev) => prev ?? []);
      }
    },
    [toast]
  );

  useEffect(() => {
    setItems(null);
    load(type, null);
  }, [type, load]);

  const more = async () => {
    setLoadingMore(true);
    await load(type, cursor);
    setLoadingMore(false);
  };

  // Group consecutive items under day headings.
  const groups: { day: string; items: Activity[] }[] = [];
  for (const a of items ?? []) {
    const day = dayHeading(a.createdAt);
    if (groups.at(-1)?.day === day) groups.at(-1)!.items.push(a);
    else groups.push({ day, items: [a] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="Everything you've generated, checked and saved." />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter activity">
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            aria-pressed={type === f.value}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              type === f.value ? "bg-white text-black" : "border border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!items ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-dashed border-white/10">
          <EmptyState icon={History} title={type ? "Nothing of this kind yet" : "No activity yet"}>
            Draft a README, check a repo or save a document and it&apos;ll show up here.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-500">{g.day}</h2>
              <ol className="relative space-y-1 border-l border-white/10 pl-6">
                {g.items.map((a) => {
                  const info = activityInfo(a);
                  const Icon = info.icon;
                  const row = (
                    <>
                      <span className="absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#0a0a0a]">
                        <Icon className="h-3 w-3 text-neutral-300" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">{info.label}</span>
                        <span className="block truncate font-mono text-[11px] text-neutral-600">{[a.repo, info.detail].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-neutral-600">
                        {new Date(a.createdAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      {info.href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-600 group-hover:text-white" />}
                    </>
                  );
                  return (
                    <li key={a.id} className="relative">
                      {info.href ? (
                        <Link href={info.href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03]">
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-2.5">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {cursor && (
            <div className="flex justify-center">
              <button onClick={more} disabled={loadingMore} className={btn.secondary}>
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
