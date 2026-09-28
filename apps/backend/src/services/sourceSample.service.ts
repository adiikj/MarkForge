import { fetchRaw, type RepoSnapshot } from "./github.service.js";

// Picks a handful of files that say the most about what a project *does* (entry points,
// routes, CLI definitions, main pages) so the AI can describe features from real code.

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|py|go|rs|rb|php|java|kt|swift|vue|svelte)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|vendor|\.next|coverage|__tests__|tests?|spec|fixtures|examples?|docs?)\//i;
const TEST_FILE = /\.(test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|_test\.go$/i;

const MAX_FILES = 10;
const MAX_BYTES_PER_FILE = 6_000;
// Kept small by default: Groq's free tier limits tokens per minute. Override with AI_SOURCE_BYTES.
const MAX_TOTAL_BYTES = Number(process.env.AI_SOURCE_BYTES) || 20_000;

const score = (path: string): number => {
  const name = path.split("/").pop()!.toLowerCase();
  const depth = path.split("/").length - 1;
  let s = 0;
  if (/^(index|main|app|server|cli|mod|lib|__main__|manage)\.[a-z]+$/.test(name)) s += 40;
  if (/^(page|layout|route|router|routes|api|handler|controller|commands?)\b/.test(name)) s += 25;
  if (/(^|\/)(routes?|controllers?|commands?|api|handlers?|cmd|pages|app)\//i.test(path)) s += 15;
  if (/(^|\/)src\//.test(path)) s += 10;
  if (/config|constants|types?\.d\.ts/i.test(name)) s -= 10;
  s -= depth * 4;
  return s;
};

export interface SourceFile {
  path: string;
  content: string;
  truncated: boolean;
}

export const fetchSourceSample = async (snapshot: RepoSnapshot): Promise<SourceFile[]> => {
  const candidates = snapshot.paths
    .filter((p) => CODE_EXT.test(p) && !SKIP.test(p) && !TEST_FILE.test(p))
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_FILES)
    .map((c) => c.p);

  const { owner, name, defaultBranch } = snapshot.meta;
  const contents = await Promise.all(candidates.map((p) => fetchRaw(owner, name, defaultBranch, p)));

  const out: SourceFile[] = [];
  let total = 0;
  candidates.forEach((path, i) => {
    const text = contents[i];
    if (text == null || total >= MAX_TOTAL_BYTES) return;
    const budget = Math.min(MAX_BYTES_PER_FILE, MAX_TOTAL_BYTES - total);
    const truncated = text.length > budget;
    const content = truncated ? text.slice(0, budget) : text;
    total += content.length;
    out.push({ path, content, truncated });
  });
  return out;
};
