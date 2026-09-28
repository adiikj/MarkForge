"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, GitBranch, Loader2, RefreshCw, Trash2 } from "lucide-react";
import RepoInput from "../RepoInput";
import ScoreRing from "../health/ScoreRing";
import { btn, ConfirmDialog, EmptyState, PageHeader, relativeTime, Skeleton } from "./ui";
import { ScoreSparkline } from "./charts";
import { dashboardApi, type TrackedRepo } from "../../lib/account";
import { useToast } from "../../lib/toast";

const Repos = () => {
  const toast = useToast();
  const [repos, setRepos] = useState<TrackedRepo[] | null>(null);
  const [limit, setLimit] = useState(0);
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<TrackedRepo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await dashboardApi.repos();
      setRepos(res.repos);
      setLimit(res.limit);
    } catch (err) {
      toast((err as Error).message, "error");
      setRepos([]);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const track = async (repo: string) => {
    setAdding(true);
    try {
      const res = await dashboardApi.trackRepo(repo);
      toast(res.hasReadme ? `Tracking ${res.repo.fullName}: scored ${res.repo.lastScore}.` : `Tracking ${res.repo.fullName}. It has no README yet.`);
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setAdding(false);
    }
  };

  const recheck = async (r: TrackedRepo) => {
    setChecking(r.id);
    try {
      const { repo, previousScore } = await dashboardApi.recheckRepo(r.id);
      const delta = previousScore !== null && repo.lastScore !== null ? repo.lastScore - previousScore : null;
      toast(
        delta === null || delta === 0
          ? `${r.fullName}: ${repo.lastScore}, unchanged.`
          : `${r.fullName}: ${previousScore} → ${repo.lastScore} (${delta > 0 ? "+" : ""}${delta}).`
      );
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setChecking(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await dashboardApi.untrackRepo(removing.id);
      setRepos((rs) => rs?.filter((x) => x.id !== removing.id) ?? null);
      toast(`Stopped tracking ${removing.fullName}.`);
      setRemoving(null);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repos"
        description={repos ? `Tracking ${repos.length} of ${limit}. Re-check any time to see if your README improved.` : "Track README health over time."}
      />

      <div className="max-w-2xl">
        <RepoInput onSubmit={track} loading={adding} buttonLabel="Track" />
      </div>

      {!repos ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !repos.length ? (
        <div className="rounded-2xl border border-dashed border-white/10">
          <EmptyState icon={GitBranch} title="No repos tracked yet">
            Add a public repo above. MarkForge scores its README now and keeps a history every time you re-check.
          </EmptyState>
        </div>
      ) : (
        <ul className="space-y-3">
          {repos.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">
              <ScoreRing score={r.lastScore ?? 0} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate font-medium hover:underline hover:underline-offset-4">
                    {r.fullName} <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  </a>
                  {r.lastGrade && <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-black">{r.lastGrade}</span>}
                </div>
                {r.description && <p className="mt-1 truncate text-sm text-neutral-500">{r.description}</p>}
                <p className="mt-1.5 text-xs text-neutral-600">
                  {r.lastCheckedAt ? `Checked ${relativeTime(r.lastCheckedAt)}` : "Not checked yet"} · {r.history.length} check{r.history.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="hidden md:block">
                <p className="mb-1 text-[11px] text-neutral-600">Score history</p>
                <ScoreSparkline points={r.history} />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => recheck(r)} disabled={checking !== null} className={btn.secondary}>
                  {checking === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-check
                </button>
                <Link href={`/health?repo=${encodeURIComponent(r.fullName)}`} className={btn.ghost}>
                  Report
                </Link>
                <button onClick={() => setRemoving(r)} aria-label={`Stop tracking ${r.fullName}`} title="Stop tracking" className={btn.ghost}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Stop tracking this repo?"
        confirmLabel="Stop tracking"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      >
        {removing?.fullName} and its score history will be removed from your dashboard. The repo itself isn&apos;t affected.
      </ConfirmDialog>
    </div>
  );
};

export default Repos;
