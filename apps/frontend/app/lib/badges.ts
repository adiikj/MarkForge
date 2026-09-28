import type { RepoProfile } from "./api";

export type BadgeStyle = "flat" | "flat-square" | "for-the-badge" | "plastic" | "social";

export interface Badge {
  id: string;
  group: BadgeGroup;
  /** Name shown in the picker. */
  name: string;
  alt: string;
  image: string;
  link: string | null;
}

export type BadgeGroup = "Build" | "Package" | "Repository" | "Community" | "Tech stack";
export const BADGE_GROUPS: BadgeGroup[] = ["Build", "Package", "Repository", "Community", "Tech stack"];

const SHIELDS = "https://img.shields.io";

/** Escape text for a shields.io static badge path segment. */
export const shieldText = (s: string) => encodeURIComponent(s.replace(/-/g, "--").replace(/_/g, "__")).replace(/%20/g, "_");

const withStyle = (url: string, style: BadgeStyle, extra: Record<string, string> = {}) => {
  const u = new URL(url);
  u.searchParams.set("style", style);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  return u.toString();
};

// simple-icons slugs (https://simpleicons.org) for stack names the analyzer reports.
export const TECH_LOGOS: Record<string, string> = {
  "Next.js": "nextdotjs",
  React: "react",
  "React Native": "react",
  TypeScript: "typescript",
  JavaScript: "javascript",
  "Node.js": "nodedotjs",
  "Tailwind CSS": "tailwindcss",
  Express: "express",
  Vue: "vuedotjs",
  Nuxt: "nuxt",
  Svelte: "svelte",
  SvelteKit: "svelte",
  Astro: "astro",
  Angular: "angular",
  NestJS: "nestjs",
  Vite: "vite",
  Turborepo: "turborepo",
  GraphQL: "graphql",
  Electron: "electron",
  "Three.js": "threedotjs",
  Prisma: "prisma",
  "MongoDB (Mongoose)": "mongodb",
  MongoDB: "mongodb",
  PostgreSQL: "postgresql",
  MySQL: "mysql",
  Redis: "redis",
  Supabase: "supabase",
  Firebase: "firebase",
  Stripe: "stripe",
  Docker: "docker",
  Jest: "jest",
  Vitest: "vitest",
  Python: "python",
  Django: "django",
  Flask: "flask",
  FastAPI: "fastapi",
  PyTorch: "pytorch",
  TensorFlow: "tensorflow",
  pandas: "pandas",
  NumPy: "numpy",
  Go: "go",
  Rust: "rust",
  PHP: "php",
  Laravel: "laravel",
  Ruby: "ruby",
  "Ruby on Rails": "rubyonrails",
  Java: "openjdk",
  "Spring Boot": "springboot",
  Bun: "bun",
  Deno: "deno",
  Vercel: "vercel",
  Git: "git",
};

export const techBadge = (name: string, style: BadgeStyle, color: string): Badge => ({
  id: `tech:${name}`,
  group: "Tech stack",
  name,
  alt: name,
  image: withStyle(`${SHIELDS}/badge/${shieldText(name)}-${color}`, style, {
    ...(TECH_LOGOS[name] ? { logo: TECH_LOGOS[name] } : {}),
    logoColor: "white",
  }),
  link: null,
});

export const customBadge = (
  b: { label: string; message: string; color: string; logo: string; link: string },
  style: BadgeStyle
): Badge => {
  const path = b.label.trim()
    ? `${shieldText(b.label.trim())}-${shieldText(b.message.trim() || " ")}-${b.color}`
    : `${shieldText(b.message.trim() || " ")}-${b.color}`;
  return {
    id: `custom:${b.label}:${b.message}`,
    group: "Community",
    name: [b.label, b.message].filter(Boolean).join(": "),
    alt: [b.label, b.message].filter(Boolean).join(" ") || "badge",
    image: withStyle(`${SHIELDS}/badge/${path}`, style, b.logo.trim() ? { logo: b.logo.trim() } : {}),
    link: b.link.trim() || null,
  };
};

/** Every badge that applies, given what we know about the repo (or nothing). */
export const buildCatalog = (p: RepoProfile | null, style: BadgeStyle, techColor: string): Badge[] => {
  const s = (url: string, extra?: Record<string, string>) => withStyle(url, style, extra);
  const list: Badge[] = [];

  if (p) {
    const { owner, name } = p;
    const gh = `https://github.com/${owner}/${name}`;
    const repo = (id: string, label: string, path: string, link: string): Badge => ({
      id,
      group: "Repository",
      name: label,
      alt: label,
      image: s(`${SHIELDS}/github/${path}/${owner}/${name}`),
      link,
    });

    for (const wf of p.ciWorkflows) {
      list.push({
        id: `ci:${wf}`,
        group: "Build",
        name: `CI · ${wf}`,
        alt: `${wf.replace(/\.ya?ml$/, "")} workflow status`,
        image: s(`${SHIELDS}/github/actions/workflow/status/${owner}/${name}/${wf}`, { label: wf.replace(/\.ya?ml$/, "") }),
        link: `${gh}/actions/workflows/${wf}`,
      });
    }
    list.push({
      id: "codecov",
      group: "Build",
      name: "Codecov coverage",
      alt: "Code coverage",
      image: s(`${SHIELDS}/codecov/c/github/${owner}/${name}`),
      link: `https://codecov.io/gh/${owner}/${name}`,
    });

    if (p.npmPackage) {
      const pkg = p.npmPackage;
      list.push(
        { id: "npm-v", group: "Package", name: "npm version", alt: "npm version", image: s(`${SHIELDS}/npm/v/${pkg}`), link: `https://www.npmjs.com/package/${pkg}` },
        { id: "npm-dm", group: "Package", name: "npm downloads", alt: "npm downloads", image: s(`${SHIELDS}/npm/dm/${pkg}`), link: `https://www.npmjs.com/package/${pkg}` },
        { id: "bundle", group: "Package", name: "Bundle size", alt: "minzipped size", image: s(`${SHIELDS}/bundlephobia/minzip/${pkg}`), link: `https://bundlephobia.com/package/${pkg}` }
      );
    }
    if (p.pypiPackage) {
      const pkg = p.pypiPackage;
      list.push(
        { id: "pypi-v", group: "Package", name: "PyPI version", alt: "PyPI version", image: s(`${SHIELDS}/pypi/v/${pkg}`), link: `https://pypi.org/project/${pkg}/` },
        { id: "pypi-py", group: "Package", name: "Python versions", alt: "Supported Python versions", image: s(`${SHIELDS}/pypi/pyversions/${pkg}`), link: `https://pypi.org/project/${pkg}/` }
      );
    }
    if (p.crateName) {
      list.push(
        { id: "crate", group: "Package", name: "crates.io", alt: "crates.io version", image: s(`${SHIELDS}/crates/v/${p.crateName}`), link: `https://crates.io/crates/${p.crateName}` },
        { id: "docsrs", group: "Package", name: "docs.rs", alt: "docs.rs", image: s(`${SHIELDS}/docsrs/${p.crateName}`), link: `https://docs.rs/${p.crateName}` }
      );
    }
    if (p.goModule) {
      list.push({
        id: "gopkg",
        group: "Package",
        name: "Go reference",
        alt: "Go Reference",
        image: `https://pkg.go.dev/badge/${p.goModule}.svg`,
        link: `https://pkg.go.dev/${p.goModule}`,
      });
    }
    list.push({ id: "release", group: "Package", name: "Latest release", alt: "Latest release", image: s(`${SHIELDS}/github/v/release/${owner}/${name}`), link: `${gh}/releases` });

    if (p.license) list.push(repo("license", "License", "license", p.licensePath ? `${gh}/blob/${p.repo.defaultBranch}/${p.licensePath}` : gh));
    list.push(
      repo("stars", "Stars", "stars", `${gh}/stargazers`),
      repo("forks", "Forks", "forks", `${gh}/network/members`),
      repo("issues", "Open issues", "issues", `${gh}/issues`),
      repo("prs", "Open PRs", "issues-pr", `${gh}/pulls`),
      repo("last-commit", "Last commit", "last-commit", `${gh}/commits`),
      repo("contributors", "Contributors", "contributors", `${gh}/graphs/contributors`),
      repo("top-lang", "Top language", "languages/top", gh),
      repo("size", "Repo size", "repo-size", gh)
    );
  }

  list.push(
    {
      id: "prs-welcome",
      group: "Community",
      name: "PRs welcome",
      alt: "PRs welcome",
      image: s(`${SHIELDS}/badge/PRs-welcome-brightgreen`),
      link: p?.contributingPath ?? null,
    },
    { id: "maintained", group: "Community", name: "Maintained", alt: "Maintained: yes", image: s(`${SHIELDS}/badge/maintained-yes-brightgreen`), link: null },
    { id: "made-with", group: "Community", name: "Made with love", alt: "Made with love", image: s(`${SHIELDS}/badge/made_with-%E2%9D%A4-red`), link: null }
  );
  if (p?.homepage) {
    list.push({ id: "website", group: "Community", name: "Website", alt: "Website", image: s(`${SHIELDS}/badge/website-live-blue`, { logo: "googlechrome", logoColor: "white" }), link: p.homepage });
  }

  const stack = p?.stack.length ? p.stack : [];
  for (const t of stack) list.push(techBadge(t, style, techColor));

  return list;
};

export const toMarkdown = (badges: Badge[]): string =>
  badges.map((b) => (b.link ? `[![${b.alt}](${b.image})](${b.link})` : `![${b.alt}](${b.image})`)).join(" ");

export const toHtml = (badges: Badge[], align: "left" | "center"): string => {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const tags = badges.map((b) => {
    const img = `<img alt="${esc(b.alt)}" src="${esc(b.image)}">`;
    return `  ${b.link ? `<a href="${esc(b.link)}">${img}</a>` : img}`;
  });
  return [`<p${align === "center" ? ' align="center"' : ""}>`, ...tags, "</p>"].join("\n");
};
