// Table helpers shared by the Table Editor and Converters.

export type Align = "none" | "left" | "center" | "right";

export interface TableData {
  header: string[];
  rows: string[][];
  align: Align[];
}

/** RFC 4180-ish parser: quoted fields, escaped quotes, CRLF, embedded newlines. */
export const parseDelimited = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
};

/** Pick the delimiter that splits the first lines most consistently. */
export const detectDelimiter = (text: string): string => {
  const sample = text.split(/\r?\n/).slice(0, 5).filter(Boolean);
  let best = ",";
  let bestScore = 0;
  for (const d of ["\t", ",", ";", "|"]) {
    const counts = sample.map((l) => l.split(d).length - 1);
    if (!counts.length || counts[0] === 0) continue;
    const consistent = counts.every((c) => c === counts[0]);
    const score = counts[0] * (consistent ? 2 : 1);
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
};

const splitMdRow = (line: string): string[] => {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|") && !l.endsWith("\\|")) l = l.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === "\\" && l[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (ch === "`") {
      inCode = !inCode;
      cur += ch;
    } else if (ch === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  cells.push(cur.trim());
  return cells;
};

const DELIM_ROW = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

/** Parse the first GFM table in `md`, or null. */
export const parseMarkdownTable = (md: string): TableData | null => {
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].includes("|") || !DELIM_ROW.test(lines[i + 1])) continue;
    const header = splitMdRow(lines[i]);
    const align = splitMdRow(lines[i + 1]).map((c): Align => {
      const l = c.startsWith(":");
      const r = c.endsWith(":");
      return l && r ? "center" : r ? "right" : l ? "left" : "none";
    });
    const rows: string[][] = [];
    for (let j = i + 2; j < lines.length && lines[j].includes("|") && lines[j].trim(); j++) rows.push(splitMdRow(lines[j]));
    return normalize({ header, rows, align });
  }
  return null;
};

/** Pad every row to the widest column count. */
export const normalize = (t: TableData): TableData => {
  const cols = Math.max(t.header.length, ...t.rows.map((r) => r.length), 1);
  const pad = (r: string[]) => [...r, ...Array(Math.max(0, cols - r.length)).fill("")].slice(0, cols);
  return { header: pad(t.header), rows: t.rows.map(pad), align: [...t.align, ...Array(cols).fill("none")].slice(0, cols) as Align[] };
};

/** Rows (first row = header) → TableData. */
export const fromRows = (rows: string[][]): TableData =>
  normalize({ header: rows[0] ?? [""], rows: rows.slice(1), align: [] });

/** Best-effort import of CSV, TSV, or a Markdown table. */
export const importTable = (text: string): TableData | null => {
  const md = parseMarkdownTable(text);
  if (md) return md;
  const rows = parseDelimited(text.trim(), detectDelimiter(text));
  return rows.length ? fromRows(rows) : null;
};

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
// Visible width, so emoji and CJK don't throw padding off too badly.
const width = (s: string) => [...s].reduce((w, ch) => w + (/[ᄀ-￿\u{1f000}-\u{1faff}]/u.test(ch) ? 2 : 1), 0);

export const toMarkdownTable = (t: TableData, pretty = true): string => {
  const header = t.header.map(esc);
  const rows = t.rows.map((r) => r.map(esc));
  const widths = header.map((h, c) => (pretty ? Math.max(3, width(h), ...rows.map((r) => width(r[c] ?? ""))) : 3));
  const pad = (s: string, c: number) => {
    if (!pretty) return s;
    const gap = widths[c] - width(s);
    if (t.align[c] === "right") return " ".repeat(gap) + s;
    if (t.align[c] === "center") return " ".repeat(Math.floor(gap / 2)) + s + " ".repeat(Math.ceil(gap / 2));
    return s + " ".repeat(gap);
  };
  const line = (cells: string[]) => `| ${cells.map((c, i) => pad(c, i)).join(" | ")} |`;
  const delim = widths.map((w, c) => {
    const a = t.align[c];
    const dashes = "-".repeat(Math.max(1, w - (a === "center" ? 2 : a === "none" ? 0 : 1)));
    return a === "center" ? `:${dashes}:` : a === "left" ? `:${dashes}` : a === "right" ? `${dashes}:` : dashes;
  });
  return [line(header), `| ${delim.join(" | ")} |`, ...rows.map(line)].join("\n") + "\n";
};

export const toCsv = (t: TableData, delimiter = ","): string => {
  const q = (s: string) => (/[",\n\r]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s);
  return [t.header, ...t.rows].map((r) => r.map(q).join(delimiter)).join("\n") + "\n";
};

/** Array of objects (or array of arrays) → table. */
export const fromJson = (value: unknown): TableData | null => {
  const arr = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value).find(Array.isArray) : null;
  if (!arr || !arr.length) return null;
  const cell = (v: unknown) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  if (arr.every(Array.isArray)) return fromRows((arr as unknown[][]).map((r) => r.map(cell)));
  const keys = [...new Set(arr.flatMap((o) => (o && typeof o === "object" ? Object.keys(o) : [])))];
  if (!keys.length) return null;
  return normalize({ header: keys, rows: arr.map((o) => keys.map((k) => cell((o as Record<string, unknown>)?.[k]))), align: [] });
};
