"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, FileText, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { btn, ConfirmDialog, EmptyState, PageHeader, relativeTime, Skeleton } from "./ui";
import { dashboardApi, type DocumentSummary } from "../../lib/account";
import { useToast } from "../../lib/toast";

const KIND_LABEL = { README: "README", PROFILE: "Profile", DOCS: "Docs", CHANGELOG: "Changelog", OTHER: "Other" } as const;

const Documents = () => {
  const toast = useToast();
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [limit, setLimit] = useState(0);
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<DocumentSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (q: string) => {
    try {
      const res = await dashboardApi.documents(q);
      setDocs(res.documents);
      setLimit(res.limit);
    } catch (err) {
      toast((err as Error).message, "error");
      setDocs([]);
    }
  }, [toast]);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(query.trim()), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  const rename = async () => {
    if (!renaming?.title.trim()) return;
    try {
      await dashboardApi.updateDocument(renaming.id, { title: renaming.title.trim() });
      setDocs((d) => d?.map((x) => (x.id === renaming.id ? { ...x, title: renaming.title.trim() } : x)) ?? null);
      setRenaming(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const download = async (d: DocumentSummary) => {
    const { document } = await dashboardApi.document(d.id);
    const url = URL.createObjectURL(new Blob([document.content], { type: "text/markdown" }));
    const name = d.kind === "README" || d.kind === "PROFILE" ? "README.md" : `${d.title.replace(/[^\w.-]+/g, "-")}.md`;
    Object.assign(window.document.createElement("a"), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  };

  const duplicate = async (d: DocumentSummary) => {
    try {
      const { document } = await dashboardApi.document(d.id);
      await dashboardApi.createDocument({ title: `${d.title} (copy)`, content: document.content, kind: d.kind, repo: d.repo });
      toast("Duplicated.");
      load(query.trim());
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await dashboardApi.deleteDocument(deleting.id);
      setDocs((d) => d?.filter((x) => x.id !== deleting.id) ?? null);
      toast(`Deleted “${deleting.title}”.`);
      setDeleting(null);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description={docs ? `${docs.length}${query ? " matching" : ""} of ${limit} saved on your plan. Synced across devices.` : "Your saved drafts."}
        actions={
          <Link href="/generate" className={btn.primary}>
            <Plus className="h-4 w-4" /> New document
          </Link>
        }
      />

      <label className="flex max-w-md items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 focus-within:border-white/25">
        <Search className="h-4 w-4 text-neutral-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or repo"
          aria-label="Search documents"
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="text-neutral-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {!docs ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : !docs.length ? (
        <div className="rounded-2xl border border-dashed border-white/10">
          {query ? (
            <EmptyState icon={Search} title={`Nothing matches “${query}”`} />
          ) : (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              action={
                <Link href="/generate" className={btn.primary}>
                  Open the Studio
                </Link>
              }
            >
              Write or generate a README in the Studio, then hit Save. It&apos;ll be here on every device.
            </EmptyState>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {docs.map((d) => (
            <article key={d.id} className="group flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] transition-colors hover:border-white/20">
              <div className="flex-1 p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    {KIND_LABEL[d.kind]}
                  </span>
                  {d.repo && <span className="truncate font-mono text-[11px] text-neutral-600">{d.repo}</span>}
                </div>
                {renaming?.id === d.id ? (
                  <form
                    className="mt-3 flex items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      rename();
                    }}
                  >
                    <input
                      autoFocus
                      value={renaming.title}
                      maxLength={120}
                      onChange={(e) => setRenaming({ ...renaming, title: e.target.value })}
                      onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                      aria-label="Document title"
                      className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/[0.04] px-2.5 py-1.5 text-sm outline-none focus:border-white/40"
                    />
                    <button type="submit" aria-label="Save title" className={btn.ghost}>
                      <Check className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <Link href={`/generate?doc=${d.id}`} className="mt-3 block text-base font-medium hover:underline hover:underline-offset-4">
                    {d.title}
                  </Link>
                )}
                <p className="mt-2 line-clamp-3 text-sm text-neutral-500">{d.excerpt || "Empty document"}</p>
              </div>
              <div className="flex items-center gap-1 border-t border-white/[0.06] px-3 py-2">
                <span className="px-1.5 text-xs text-neutral-600">Edited {relativeTime(d.updatedAt)}</span>
                <span className="ml-auto flex items-center">
                  <button onClick={() => setRenaming({ id: d.id, title: d.title })} aria-label={`Rename ${d.title}`} title="Rename" className={btn.ghost}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => duplicate(d)} aria-label={`Duplicate ${d.title}`} title="Duplicate" className={btn.ghost}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => download(d)} aria-label={`Download ${d.title}`} title="Download .md" className={btn.ghost}>
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleting(d)} aria-label={`Delete ${d.title}`} title="Delete" className={btn.ghost}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this document?"
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      >
        “{deleting?.title}” will be permanently deleted. This can&apos;t be undone.
      </ConfirmDialog>
    </div>
  );
};

export default Documents;
