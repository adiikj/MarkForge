import type { RawCommit } from "./github.service.js";

/** Keep a Changelog sections, plus "Other" for anything we can't place. */
export type ChangeKind = "breaking" | "added" | "changed" | "deprecated" | "removed" | "fixed" | "security" | "performance" | "docs" | "other";

export interface ChangeEntry {
  kind: ChangeKind;
  /** Conventional-commit scope, e.g. "api" in "feat(api): …". */
  scope: string | null;
  subject: string;
  breaking: boolean;
  pr: number | null;
  sha: string;
  url: string;
  author: string | null;
  /** Housekeeping (chore/ci/build/test/style) — hidden by default in the UI. */
  noise: boolean;
}

const CONVENTIONAL_RE = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

const TYPE_MAP: Record<string, { kind: ChangeKind; noise?: boolean }> = {
  feat: { kind: "added" },
  feature: { kind: "added" },
  fix: { kind: "fixed" },
  bugfix: { kind: "fixed" },
  perf: { kind: "performance" },
  refactor: { kind: "changed" },
  revert: { kind: "changed" },
  docs: { kind: "docs" },
  doc: { kind: "docs" },
  security: { kind: "security" },
  deprecate: { kind: "deprecated" },
  remove: { kind: "removed" },
  chore: { kind: "other", noise: true },
  ci: { kind: "other", noise: true },
  build: { kind: "other", noise: true },
  test: { kind: "other", noise: true },
  tests: { kind: "other", noise: true },
  style: { kind: "other", noise: true },
  deps: { kind: "other", noise: true },
};

// For commits that don't follow Conventional Commits, guess from the leading verb.
const KEYWORDS: [RegExp, ChangeKind][] = [
  [/^(security|cve-|vuln)/i, "security"],
  [/^(fix(es|ed)?|bug|resolve[sd]?|patch|hotfix|correct)/i, "fixed"],
  [/^(remove[sd]?|delete[sd]?|drop(ped)?)/i, "removed"],
  [/^deprecate/i, "deprecated"],
  [/^(add(s|ed)?|new|introduce[sd]?|implement(s|ed)?|support|create[sd]?|allow)/i, "added"],
  [/^(perf|speed ?up|optimi[sz]e[sd]?|faster)/i, "performance"],
  [/^(docs?|readme|document)/i, "docs"],
  [/^(update[sd]?|change[sd]?|improve[sd]?|refactor(ed)?|rename[sd]?|move[sd]?|bump(ed)?|upgrade[sd]?|use|make|replace[sd]?|simplif)/i, "changed"],
];

const NOISE_RE = /^(bump|update|upgrade)\b.*\b(dependenc|deps|version|lockfile)|^merge branch|^wip\b|^(format|lint|typo)/i;

export const classifyCommit = (c: RawCommit): ChangeEntry | null => {
  const [firstLine, ...rest] = c.message.split("\n");
  const body = rest.join("\n");
  let subject = firstLine.trim();
  let pr: number | null = null;

  // "Merge pull request #12 from user/branch" → use the PR title from the body.
  const merge = subject.match(/^Merge pull request #(\d+) from \S+/);
  if (merge) {
    pr = Number(merge[1]);
    subject = body.split("\n").map((l) => l.trim()).find(Boolean) ?? subject;
  } else if (/^Merge (branch|remote-tracking branch) /.test(subject)) {
    return null;
  }

  // Squash merges end with "(#123)".
  const trailingPr = subject.match(/\s*\(#(\d+)\)\s*$/);
  if (trailingPr) {
    pr ??= Number(trailingPr[1]);
    subject = subject.slice(0, trailingPr.index).trim();
  }

  const breakingBody = /^BREAKING[ -]CHANGE:/m.test(body);
  const conv = subject.match(CONVENTIONAL_RE);
  let kind: ChangeKind = "other";
  let scope: string | null = null;
  let breaking = breakingBody;
  let noise = false;

  if (conv && TYPE_MAP[conv[1].toLowerCase()]) {
    const mapped = TYPE_MAP[conv[1].toLowerCase()];
    kind = mapped.kind;
    noise = Boolean(mapped.noise);
    scope = conv[2] ?? null;
    breaking ||= Boolean(conv[3]);
    subject = conv[4].trim();
  } else {
    kind = KEYWORDS.find(([re]) => re.test(subject))?.[1] ?? "other";
    noise = NOISE_RE.test(subject);
  }

  if (breaking) {
    kind = "breaking";
    noise = false;
  }
  subject = subject.charAt(0).toUpperCase() + subject.slice(1);

  return { kind, scope, subject, breaking, pr, sha: c.sha, url: c.url, author: c.author, noise };
};

export const buildChangelog = (commits: RawCommit[]): ChangeEntry[] => {
  const seen = new Set<string>();
  const entries: ChangeEntry[] = [];
  for (const c of commits) {
    const e = classifyCommit(c);
    if (!e) continue;
    // Merge commit and the squashed commit for the same PR often both appear.
    const key = e.pr ? `pr:${e.pr}` : `s:${e.subject.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(e);
  }
  // Newest first reads better in release notes.
  return entries.reverse();
};
