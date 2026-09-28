import { posix } from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Root, Heading, Image, Link, Code, Html, RootContent, Nodes } from "mdast";
import type { ProjectProfile } from "./analyzer.service.js";
import {
  badgesLine,
  contributingSection,
  envSection,
  installSection,
  licenseSection,
  slugify,
  tableOfContents,
  usageSection,
} from "./readmeGenerator.service.js";

/**
 * Edits the client applies to the Markdown. Section inserts are positional rather than
 * offset-based so several fixes can be applied in any order.
 */
export type FixOp =
  | { type: "prepend"; content: string }
  | { type: "afterTitle"; content: string }
  | { type: "beforeFirstSection"; content: string }
  /** Before Contributing / License / Acknowledgements, or at the end if none exist. */
  | { type: "beforeClosingSections"; content: string }
  | { type: "append"; content: string }
  | { type: "replace"; find: string; replace: string };

export interface Fix {
  label: string;
  ops: FixOp[];
}

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckCategory = "essentials" | "links" | "structure" | "polish";

export interface Check {
  id: string;
  label: string;
  category: CheckCategory;
  status: CheckStatus;
  weight: number;
  detail: string;
  items?: string[];
  fix?: Fix;
}

export interface HealthReport {
  score: number;
  grade: string;
  verdict: string;
  checks: Check[];
  stats: { words: number; headings: number; images: number; links: number; codeBlocks: number };
}

export interface HealthContext {
  /** Present when checking a repo: enables file-link checks and repo-aware fixes. */
  profile?: ProjectProfile;
  paths?: string[];
  /** Folder the README lives in ("" for the root); relative links resolve from here. */
  baseDir?: string;
  /** Profile READMEs (github.com/<user>/<user>) don't need install/usage/license sections. */
  kind: "project" | "profile";
}

const INSTALL_RE = /install|getting started|set\s?up|quick\s?start|build(ing)? from source/i;
const USAGE_RE = /usage|examples?|how to use|demo|commands|api|quick\s?start|getting started|running/i;
const LICENSE_RE = /licen[cs]e/i;
const CONTRIB_RE = /contribut/i;
const TOC_RE = /contents|\btoc\b/i;
const BADGE_RE = /shields\.io|badgen\.net|badge|\/workflows\/.*\.svg|codecov\.io|forthebadge/i;
const PLACEHOLDER_RE = /\bTODO\b|lorem ipsum|your[-_ ]?user(name)?\b|\[your [^\]]+\]|\byour-repo\b/i;
const SHELL_RE = /^\s*(\$ |#!|npm |npx |pnpm |yarn |bun |git |cd |pip3? |python3? |uv |poetry |docker |curl |wget |go |cargo |brew |sudo |apt |mkdir |cp |mv |export |source |make |composer |bundle )/;

const textOf = (node: Nodes): string => {
  if ("value" in node && typeof node.value === "string" && node.type !== "html") return node.value;
  if ("children" in node) return (node.children as Nodes[]).map(textOf).join("");
  return "";
};

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const altFromUrl = (url: string): string => {
  if (BADGE_RE.test(url)) {
    const m = url.match(/badge\/([^-?/]+)/) ?? url.match(/shields\.io\/[^/]+\/([^/?]+)/);
    return m ? `${decodeURIComponent(m[1]).replace(/[_+]/g, " ")} badge` : "badge";
  }
  const base = decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() ?? "");
  const name = base.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  return name || "image";
};

const guessLang = (code: string): string => {
  const first = code.split("\n").find((l) => l.trim()) ?? "";
  if (SHELL_RE.test(first)) return "bash";
  if (/^\s*[{[]/.test(first)) return "json";
  if (/^\s*(import |export |const |let |function )/.test(first)) return "js";
  if (/^\s*(def |from \S+ import |import \w+$)/.test(first)) return "python";
  if (/^\s*<[a-z!]/i.test(first)) return "html";
  return "text";
};

const GRADES: [number, string, string][] = [
  [90, "A", "Excellent. Ready to impress."],
  [80, "B", "Solid, with a few gaps."],
  [65, "C", "Decent, but missing key pieces."],
  [45, "D", "Needs work before people will trust it."],
  [0, "F", "Barely a README yet."],
];

export const checkReadme = (markdown: string, ctx: HealthContext): HealthReport => {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
  const { profile, paths, kind, baseDir = "" } = ctx;
  const isProject = kind === "project";
  const src = (node: Nodes) =>
    node.position ? markdown.slice(node.position.start.offset, node.position.end.offset) : "";

  // ---- Collect ----
  const headings: { depth: number; text: string }[] = [];
  const images: { url: string; alt: string; source: string; html: boolean }[] = [];
  const links: string[] = [];
  const codes: Code[] = [];
  const htmlBlocks: string[] = [];

  visit(tree, (node) => {
    switch (node.type) {
      case "heading":
        headings.push({ depth: (node as Heading).depth, text: textOf(node as Heading).trim() });
        break;
      case "image": {
        const img = node as Image;
        images.push({ url: img.url, alt: img.alt ?? "", source: src(img), html: false });
        break;
      }
      case "link":
        links.push((node as Link).url);
        break;
      case "code":
        codes.push(node as Code);
        break;
      case "html": {
        const value = (node as Html).value;
        htmlBlocks.push(value);
        for (const m of value.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
          headings.push({ depth: Number(m[1]), text: stripTags(m[2]) });
        }
        for (const m of value.matchAll(/<img\b[^>]*>/gi)) {
          const tag = m[0];
          const url = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
          const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
          images.push({ url, alt, source: tag, html: true });
        }
        for (const m of value.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) links.push(m[1]);
        break;
      }
    }
  });

  const allHtml = htmlBlocks.join("\n");
  const plain = textOf(tree) + " " + stripTags(allHtml);
  const words = plain.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const headingTexts = headings.map((h) => h.text);
  const hasHeading = (re: RegExp) => headingTexts.some((t) => re.test(t));
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // ---- Essentials ----
  const h1s = headings.filter((h) => h.depth === 1);
  add({
    id: "title",
    label: "Project title",
    category: "essentials",
    weight: 5,
    status: h1s.length ? "pass" : "fail",
    detail: h1s.length ? `"${h1s[0].text}"` : "No top-level (#) heading. Readers can't tell what this is at a glance.",
    fix: !h1s.length && profile ? { label: "Add title", ops: [{ type: "prepend", content: `# ${profile.meta.name}` }] } : undefined,
  });

  // Look for a sentence of real prose before the first ## section.
  const intro: RootContent[] = [];
  for (const node of tree.children) {
    if (node.type === "heading" && node.depth >= 2) break;
    intro.push(node);
  }
  const introText = intro
    .map((n) => (n.type === "html" ? stripTags(n.value) : n.type === "heading" ? "" : textOf(n)))
    .join(" ")
    .trim();
  const hasDescription = introText.replace(/\s+/g, " ").length >= 15;
  const desc = profile?.meta.description;
  add({
    id: "description",
    label: "Short description",
    category: "essentials",
    weight: 10,
    status: hasDescription ? "pass" : "fail",
    detail: hasDescription
      ? "There's an intro before the first section."
      : "No intro sentence under the title. Say what it does and who it's for.",
    fix: !hasDescription && desc ? { label: "Use repo description", ops: [{ type: "afterTitle", content: `> ${desc}` }] } : undefined,
  });

  if (isProject) {
    const hasInstall = hasHeading(INSTALL_RE);
    add({
      id: "install",
      label: "Installation steps",
      category: "essentials",
      weight: 15,
      status: hasInstall ? "pass" : "fail",
      detail: hasInstall
        ? `Found "${headingTexts.find((t) => INSTALL_RE.test(t))}".`
        : "No Installation or Getting Started section. This is the #1 thing visitors look for.",
      fix: !hasInstall && profile
        ? { label: "Generate from repo", ops: [{ type: "beforeClosingSections", content: installSection(profile) }] }
        : undefined,
    });

    const hasUsage = hasHeading(USAGE_RE);
    add({
      id: "usage",
      label: "Usage or examples",
      category: "essentials",
      weight: 10,
      status: hasUsage ? "pass" : "fail",
      detail: hasUsage ? `Found "${headingTexts.find((t) => USAGE_RE.test(t))}".` : "Show what it looks like in action: a snippet, screenshot or GIF.",
      fix: !hasUsage && profile
        ? { label: "Add Usage section", ops: [{ type: "beforeClosingSections", content: usageSection(profile) }] }
        : undefined,
    });

    const hasLicense = hasHeading(LICENSE_RE) || /\b(MIT|Apache|GPL|BSD|MPL|ISC)\b[^\n]{0,20}licen[cs]e/i.test(plain);
    add({
      id: "license",
      label: "License",
      category: "essentials",
      weight: 8,
      status: hasLicense ? "pass" : profile?.communityFiles.license ? "warn" : "fail",
      detail: hasLicense
        ? "License is stated."
        : profile?.communityFiles.license
          ? "The repo has a LICENSE file but the README never mentions it."
          : "No license. Without one, others legally can't use your code.",
      fix: !hasLicense ? { label: "Add License section", ops: [{ type: "append", content: licenseSection(profile ?? null) }] } : undefined,
    });
  }

  // ---- Links & media ----
  const slugs = new Set<string>();
  const seen = new Map<string, number>();
  for (const t of headingTexts) {
    const base = slugify(t);
    const n = seen.get(base) ?? 0;
    slugs.add(n ? `${base}-${n}` : base);
    seen.set(base, n + 1);
  }
  for (const m of allHtml.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)) slugs.add(m[1].toLowerCase());

  const pathSet = paths ? new Set(paths) : null;
  const ownBlob = profile
    ? new RegExp(`^https?://github\\.com/${profile.meta.owner}/${profile.meta.name}/(?:blob|tree)/[^/]+/(.+)$`, "i")
    : null;
  const broken: string[] = [];
  const targets = [...links, ...images.filter((i) => !i.html || i.url).map((i) => i.url)];
  for (const raw of new Set(targets)) {
    const url = raw.trim();
    if (!url) {
      broken.push("(empty link)");
      continue;
    }
    if (url.startsWith("#")) {
      if (url.length > 1 && !slugs.has(decodeURIComponent(url.slice(1)).toLowerCase())) broken.push(url);
      continue;
    }
    if (!pathSet) continue;
    let repoPath: string | null = null;
    const blob = ownBlob && url.match(ownBlob);
    if (blob) repoPath = blob[1];
    else if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url)) repoPath = url;
    if (repoPath === null) continue;
    let clean = repoPath.split(/[?#]/)[0];
    try {
      clean = decodeURIComponent(clean);
    } catch {
      /* keep as-is */
    }
    // "/x" is repo-root relative on GitHub; everything else is relative to the README's folder.
    clean = (blob || clean.startsWith("/") ? posix.normalize(clean) : posix.join(baseDir, clean))
      .replace(/^\/+/, "")
      .replace(/\/$/, "");
    if (!clean || clean === "." || clean.startsWith("..")) continue;
    const exists = pathSet.has(clean) || [...pathSet].some((p) => p.startsWith(clean + "/"));
    if (!exists) broken.push(url);
  }
  add({
    id: "links",
    label: "Links resolve",
    category: "links",
    weight: 10,
    status: broken.length ? "fail" : "pass",
    detail: broken.length
      ? `${broken.length} link${broken.length > 1 ? "s" : ""} point${broken.length > 1 ? "" : "s"} to files or anchors that don't exist.`
      : pathSet
        ? "All anchors and repo file links resolve."
        : "All in-page anchors resolve. (Check a repo to also verify file links.)",
    items: broken.slice(0, 8),
  });

  const noAlt = images.filter((i) => !i.alt.trim());
  const altOps: FixOp[] = noAlt
    .filter((i) => i.source)
    .map((i) => ({
      type: "replace" as const,
      find: i.source,
      replace: i.html ? i.source.replace(/\balt\s*=\s*["']\s*["']\s*/i, "").replace(/^<img\b/i, `<img alt="${altFromUrl(i.url)}"`) : i.source.replace(/^!\[\s*\]/, `![${altFromUrl(i.url)}]`),
    }));
  add({
    id: "alt-text",
    label: "Images have alt text",
    category: "links",
    weight: 7,
    status: !noAlt.length ? "pass" : noAlt.length <= images.length / 2 ? "warn" : "fail",
    detail: images.length
      ? noAlt.length
        ? `${noAlt.length} of ${images.length} images have no alt text. Screen readers skip them.`
        : `All ${images.length} images are described.`
      : "No images to check.",
    items: noAlt.slice(0, 6).map((i) => i.url || "(no src)"),
    fix: altOps.length ? { label: "Fill in alt text", ops: altOps } : undefined,
  });

  const badgeCount = images.filter((i) => BADGE_RE.test(i.url)).length;
  add({
    id: "badges",
    label: "Status badges",
    category: "links",
    weight: 3,
    status: badgeCount ? "pass" : "warn",
    detail: badgeCount ? `${badgeCount} badge${badgeCount > 1 ? "s" : ""} found.` : "Badges signal a maintained project at a glance.",
    fix: !badgeCount && profile && isProject ? { label: "Add badges", ops: [{ type: "afterTitle", content: badgesLine(profile) }] } : undefined,
  });

  // ---- Structure ----
  const skips: string[] = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].depth > headings[i - 1].depth + 1) {
      skips.push(`h${headings[i - 1].depth} → h${headings[i].depth} at "${headings[i].text}"`);
    }
  }
  add({
    id: "hierarchy",
    label: "Heading hierarchy",
    category: "structure",
    weight: 5,
    status: skips.length || h1s.length > 1 ? "warn" : "pass",
    detail: skips.length
      ? "Headings skip levels, which breaks the outline GitHub shows in its sidebar."
      : h1s.length > 1
        ? `${h1s.length} top-level (#) headings. Use one for the title and ## for sections.`
        : "Clean outline with no skipped levels.",
    items: skips.slice(0, 5),
  });

  const fenced = codes.filter((c) => /^\s*(```|~~~)/.test(src(c)));
  const noLang = fenced.filter((c) => !c.lang);
  add({
    id: "code-lang",
    label: "Code blocks are highlighted",
    category: "structure",
    weight: 5,
    status: noLang.length ? "warn" : "pass",
    detail: fenced.length
      ? noLang.length
        ? `${noLang.length} of ${fenced.length} code blocks have no language, so they render without syntax highlighting.`
        : `All ${fenced.length} code blocks declare a language.`
      : "No fenced code blocks.",
    fix: noLang.length
      ? {
          label: "Detect languages",
          ops: noLang.map((c) => {
            const s = src(c);
            return { type: "replace" as const, find: s, replace: s.replace(/^(\s*)(```|~~~)[ \t]*/, `$1$2${guessLang(c.value)}`) };
          }),
        }
      : undefined,
  });

  const h2s = headings.filter((h) => h.depth === 2).map((h) => h.text);
  const needsToc = h2s.length >= 6;
  const hasToc = hasHeading(TOC_RE) || links.filter((l) => l.startsWith("#")).length >= 4;
  add({
    id: "toc",
    label: "Table of contents",
    category: "structure",
    weight: 3,
    status: !needsToc || hasToc ? "pass" : "warn",
    detail: !needsToc ? "Short enough not to need one." : hasToc ? "Has a table of contents." : `${h2s.length} sections and no table of contents.`,
    fix: needsToc && !hasToc ? { label: "Generate TOC", ops: [{ type: "beforeFirstSection", content: tableOfContents(h2s) }] } : undefined,
  });

  add({
    id: "length",
    label: "Enough detail",
    category: "structure",
    weight: 5,
    status: words >= 150 ? "pass" : words >= 50 ? "warn" : "fail",
    detail: `${words} words. ${words >= 150 ? "Plenty to go on." : "Most good READMEs have at least 150."}`,
  });

  // ---- Polish ----
  if (isProject) {
    const hasContrib = hasHeading(CONTRIB_RE) || links.some((l) => /contributing/i.test(l));
    add({
      id: "contributing",
      label: "Contributing guide",
      category: "polish",
      weight: 5,
      status: hasContrib ? "pass" : "warn",
      detail: hasContrib ? "Tells people how to contribute." : "Say whether and how you accept contributions.",
      fix: !hasContrib ? { label: "Add Contributing section", ops: [{ type: "beforeClosingSections", content: contributingSection(profile ?? null) }] } : undefined,
    });
  }

  if (isProject && profile?.envVars.length) {
    const missing = profile.envVars.filter((v) => !markdown.includes(v.key)).map((v) => v.key);
    const total = profile.envVars.length;
    add({
      id: "env",
      label: "Environment variables documented",
      category: "polish",
      weight: 7,
      status: !missing.length ? "pass" : missing.length < total ? "warn" : "fail",
      detail: !missing.length
        ? `All ${total} variables from .env.example are mentioned.`
        : `${missing.length} of ${total} variables from .env.example are never mentioned.`,
      items: missing.slice(0, 8),
      fix: missing.length === total ? { label: "Add env table", ops: [{ type: "beforeClosingSections", content: envSection(profile) }] } : undefined,
    });
  }

  const placeholderLines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => PLACEHOLDER_RE.test(l));
  add({
    id: "placeholders",
    label: "No leftover placeholders",
    category: "polish",
    weight: 5,
    status: placeholderLines.length ? "fail" : "pass",
    detail: placeholderLines.length
      ? `${placeholderLines.length} line${placeholderLines.length > 1 ? "s" : ""} still contain TODOs or template text.`
      : "No TODOs or template leftovers.",
    items: placeholderLines.slice(0, 5).map((l) => (l.length > 90 ? l.slice(0, 87) + "…" : l)),
  });

  // ---- Score ----
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight / 2 : 0), 0);
  const score = total ? Math.round((earned / total) * 100) : 0;
  const [, grade, verdict] = GRADES.find(([min]) => score >= min)!;

  return {
    score,
    grade,
    verdict,
    checks,
    stats: { words, headings: headings.length, images: images.length, links: links.length, codeBlocks: codes.length },
  };
};
