import type { FixOp } from "./api";

const CLOSING_RE = /^##\s+.*(contribut|licen[cs]e|acknowledg|credits|authors?|support|contact)/im;

const lines = (md: string) => md.split("\n");

/**
 * Index of the line just after the title block, or 0. For an HTML <h1> that is the end of the
 * surrounding HTML block (next blank line), since Markdown inside an HTML block isn't rendered.
 */
const afterTitleLine = (md: string): number => {
  const ls = lines(md);
  let inFence = false;
  for (let i = 0; i < ls.length; i++) {
    if (/^\s*(```|~~~)/.test(ls[i])) inFence = !inFence;
    if (inFence) continue;
    if (/^#\s/.test(ls[i])) return i + 1;
    if (/<h1\b/i.test(ls[i])) {
      for (let j = i; j < ls.length; j++) if (!ls[j].trim()) return j;
      return ls.length;
    }
    if (/^##\s/.test(ls[i])) break;
  }
  return 0;
};

const insertAtLine = (md: string, line: number, block: string): string => {
  const ls = lines(md);
  const before = ls.slice(0, line).join("\n").replace(/\s+$/, "");
  const after = ls.slice(line).join("\n").replace(/^\s+/, "");
  return [before, block.trim(), after].filter(Boolean).join("\n\n") + (after ? "" : "\n");
};

const insertBeforeMatch = (md: string, re: RegExp, block: string): string => {
  const ls = lines(md);
  let inFence = false;
  for (let i = 0; i < ls.length; i++) {
    if (/^\s*(```|~~~)/.test(ls[i])) inFence = !inFence;
    if (!inFence && re.test(ls[i])) return insertAtLine(md, i, block);
  }
  return md.replace(/\s*$/, "") + "\n\n" + block.trim() + "\n";
};

export const applyOp = (md: string, op: FixOp): string => {
  switch (op.type) {
    case "prepend":
      return op.content.trim() + "\n\n" + md.replace(/^\s+/, "");
    case "append":
      return md.replace(/\s*$/, "") + "\n\n" + op.content.trim() + "\n";
    case "afterTitle":
      return insertAtLine(md, afterTitleLine(md), op.content);
    case "beforeFirstSection":
      return insertBeforeMatch(md, /^##\s/, op.content);
    case "beforeClosingSections":
      return insertBeforeMatch(md, CLOSING_RE, op.content);
    case "replace":
      return md.includes(op.find) ? md.replace(op.find, () => op.replace) : md;
  }
};

export const applyFix = (md: string, ops: FixOp[]): string => ops.reduce(applyOp, md);
