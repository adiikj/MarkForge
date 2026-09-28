"use client";

import { ClipboardEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  ArrowUpZA,
  Check,
  Copy,
  Download,
  Eye,
  FileInput,
  Minus,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Preview from "../readmegen/Preview";
import { importTable, normalize, toCsv, toMarkdownTable, type Align, type TableData } from "../../lib/table";
import { sendHandoff } from "../../lib/handoff";

const STORAGE_KEY = "markforge:table";

const STARTER: TableData = {
  header: ["Feature", "Free", "Pro"],
  rows: [
    ["Repo drafts", "3 / day", "Unlimited"],
    ["Health Score", "✓", "✓"],
    ["Private repos", "", "✓"],
  ],
  align: ["left", "center", "center"],
};

const TableEditor = () => {
  const router = useRouter();
  const [table, setTable] = useState<TableData>(STARTER);
  const [pretty, setPretty] = useState(true);
  const [view, setView] = useState<"markdown" | "preview">("markdown");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTable(normalize(JSON.parse(saved)));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
    } catch {
      /* ignore */
    }
  }, [table, ready]);

  const cols = table.header.length;
  const markdown = useMemo(() => toMarkdownTable(table, pretty), [table, pretty]);

  const update = (fn: (t: TableData) => TableData) => setTable((t) => normalize(fn(structuredClone(t))));

  const setCell = (r: number, c: number, v: string) =>
    update((t) => {
      if (r < 0) t.header[c] = v;
      else t.rows[r][c] = v;
      return t;
    });

  const addRow = (at?: number) =>
    update((t) => {
      t.rows.splice(at ?? t.rows.length, 0, Array(cols).fill(""));
      return t;
    });
  const addCol = () =>
    update((t) => {
      t.header.push(`Column ${cols + 1}`);
      t.rows.forEach((r) => r.push(""));
      t.align.push("none");
      return t;
    });
  const removeRow = (r: number) => update((t) => ({ ...t, rows: t.rows.filter((_, i) => i !== r) }));
  const removeCol = (c: number) =>
    cols > 1 &&
    update((t) => ({
      header: t.header.filter((_, i) => i !== c),
      rows: t.rows.map((r) => r.filter((_, i) => i !== c)),
      align: t.align.filter((_, i) => i !== c),
    }));
  const setAlign = (c: number, a: Align) =>
    update((t) => {
      t.align[c] = t.align[c] === a ? "none" : a;
      return t;
    });
  const sortBy = (c: number, dir: 1 | -1) =>
    update((t) => {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
      t.rows.sort((a, b) => dir * collator.compare(a[c], b[c]));
      return t;
    });

  const focusCell = (r: number, c: number) =>
    requestAnimationFrame(() => (document.querySelector(`[data-cell="${r}:${c}"]`) as HTMLInputElement | null)?.focus());

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (r === table.rows.length - 1) addRow();
      focusCell(r + 1, c);
    } else if (e.key === "ArrowDown" && r < table.rows.length - 1) focusCell(r + 1, c);
    else if (e.key === "ArrowUp" && r > -1) focusCell(r - 1, c);
  };

  // Pasting a block copied from Excel/Sheets (tab-separated) fills cells from here, growing the table.
  const onPaste = (e: ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();
    const block = text.replace(/\r?\n$/, "").split(/\r?\n/).map((l) => l.split("\t"));
    update((t) => {
      block.forEach((line, i) => {
        const row = r + i;
        line.forEach((val, j) => {
          const col = c + j;
          while (t.header.length <= col) {
            t.header.push(`Column ${t.header.length + 1}`);
            t.rows.forEach((x) => x.push(""));
          }
          if (row < 0) t.header[col] = val;
          else {
            while (t.rows.length <= row) t.rows.push(Array(t.header.length).fill(""));
            t.rows[row][col] = val;
          }
        });
      });
      return t;
    });
  };

  const doImport = () => {
    const t = importTable(importText);
    if (!t) return setImportError("Couldn't find a table in that text.");
    setTable(t);
    setImportOpen(false);
    setImportText("");
    setImportError(null);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  const save = (content: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement("a"), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  };

  const alignIcons: [Align, typeof AlignLeft][] = [
    ["left", AlignLeft],
    ["center", AlignCenter],
    ["right", AlignRight],
  ];

  const cellCls =
    "w-full min-w-[120px] bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-700 focus:bg-white/[0.06]";

  return (
    <section className="relative overflow-hidden bg-[#050505] text-white">
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:radial-gradient(ellipse_70%_100%_at_50%_0%,black_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">Table Editor</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Markdown tables, without the pipes</h1>
          <p className="mt-3 text-neutral-400">
            Edit in a grid, paste straight from Excel or Sheets, and export a neatly aligned Markdown table.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setImportOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              importOpen ? "border-white/40 bg-white/10" : "border-white/10 text-neutral-300 hover:border-white/25"
            }`}
          >
            <FileInput className="h-4 w-4" /> Import
          </button>
          <button onClick={() => addRow()} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-neutral-300 hover:border-white/25">
            <Plus className="h-4 w-4" /> Row
          </button>
          <button onClick={addCol} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-neutral-300 hover:border-white/25">
            <Plus className="h-4 w-4" /> Column
          </button>
          <button
            onClick={() => setTable({ header: ["", "", ""], rows: [["", "", ""]], align: ["none", "none", "none"] })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:text-white"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </button>
          <span className="ml-auto font-mono text-xs text-neutral-600">
            {table.rows.length} rows × {cols} cols
          </span>
        </div>

        {importOpen && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#0a0a0a] p-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste CSV, TSV (from Excel/Sheets) or an existing Markdown table…"
              spellCheck={false}
              autoFocus
              className="h-32 w-full resize-y bg-transparent p-2 font-mono text-[13px] text-neutral-200 outline-none placeholder:text-neutral-600"
            />
            <div className="flex items-center gap-2 border-t border-white/10 pt-2">
              {importError && <span className="text-xs text-neutral-400">{importError}</span>}
              <button onClick={() => setImportOpen(false)} className="ml-auto rounded-lg px-3 py-1.5 text-xs text-neutral-500 hover:text-white">
                Cancel
              </button>
              <button
                onClick={doImport}
                disabled={!importText.trim()}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
              >
                Import table
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-[#0a0a0a]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                {table.header.map((_, c) => (
                  <th key={c} className="border-r border-white/[0.06] px-2 py-1.5 last:border-r-0">
                    <div className="flex items-center gap-0.5">
                      {alignIcons.map(([a, Icon]) => (
                        <button
                          key={a}
                          onClick={() => setAlign(c, a)}
                          title={`Align ${a}`}
                          aria-pressed={table.align[c] === a}
                          className={`rounded p-1 ${table.align[c] === a ? "bg-white/15 text-white" : "text-neutral-600 hover:text-neutral-300"}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                      <span className="mx-1 h-4 w-px bg-white/10" />
                      <button onClick={() => sortBy(c, 1)} title="Sort A→Z" className="rounded p-1 text-neutral-600 hover:text-neutral-300">
                        <ArrowDownAZ className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => sortBy(c, -1)} title="Sort Z→A" className="rounded p-1 text-neutral-600 hover:text-neutral-300">
                        <ArrowUpZA className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeCol(c)}
                        disabled={cols <= 1}
                        title="Delete column"
                        className="ml-auto rounded p-1 text-neutral-600 hover:text-white disabled:opacity-30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
              <tr className="border-b border-white/15 bg-white/[0.03]">
                {table.header.map((h, c) => (
                  <th key={c} className="border-r border-white/[0.06] p-0 last:border-r-0">
                    <input
                      data-cell={`-1:${c}`}
                      value={h}
                      onChange={(e) => setCell(-1, c, e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, -1, c)}
                      onPaste={(e) => onPaste(e, -1, c)}
                      placeholder="Header"
                      style={{ textAlign: table.align[c] === "none" ? "left" : table.align[c] }}
                      className={`${cellCls} font-semibold text-white`}
                    />
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r} className="group border-b border-white/[0.06] last:border-b-0">
                  {row.map((v, c) => (
                    <td key={c} className="border-r border-white/[0.06] p-0 last:border-r-0">
                      <input
                        data-cell={`${r}:${c}`}
                        value={v}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, r, c)}
                        onPaste={(e) => onPaste(e, r, c)}
                        style={{ textAlign: table.align[c] === "none" ? "left" : table.align[c] }}
                        className={cellCls}
                      />
                    </td>
                  ))}
                  <td className="w-10 text-center">
                    <button
                      onClick={() => removeRow(r)}
                      title="Delete row"
                      className="rounded p-1 text-neutral-700 opacity-0 hover:text-white group-hover:opacity-100 focus:opacity-100"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => addRow()}
            className="flex w-full items-center justify-center gap-1.5 border-t border-white/[0.06] py-2 text-xs text-neutral-600 hover:bg-white/[0.03] hover:text-neutral-300"
          >
            <Plus className="h-3.5 w-3.5" /> Add row
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-600">Enter moves down (and adds a row at the end). Paste a block from a spreadsheet into any cell.</p>

        {/* Output */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
            <div className="flex rounded-lg border border-white/10 p-0.5">
              {(["markdown", "preview"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${view === v ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
                >
                  {v === "preview" && <Eye className="h-3.5 w-3.5" />}
                  {v === "markdown" ? "Markdown" : "Preview"}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
              <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} className="accent-white" />
              Align columns
            </label>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => save(toCsv(table), "table.csv", "text/csv")}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-white/25"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={() => {
                  sendHandoff({ append: markdown });
                  router.push("/generate");
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-white/25"
              >
                <Send className="h-3.5 w-3.5" /> Studio
              </button>
              <button onClick={copy} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy Markdown"}
              </button>
            </div>
          </div>
          {view === "markdown" ? (
            <pre className="max-h-96 overflow-auto p-5 font-mono text-[12.5px] leading-6 text-neutral-300">{markdown}</pre>
          ) : (
            <div className="max-h-96 overflow-auto p-6">
              <Preview content={markdown} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TableEditor;
