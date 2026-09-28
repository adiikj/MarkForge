import type { RepoProfile } from "./api";

export type BlockCategory = "Start" | "Reference" | "Visuals" | "Community" | "Navigation";
export const BLOCK_CATEGORIES: BlockCategory[] = ["Start", "Reference", "Visuals", "Community", "Navigation"];

export interface BlockContext {
  /** "owner/repo" when the draft came from a repo. */
  repo: string | null;
  profile: RepoProfile | null;
  /** The current draft, for blocks derived from it (e.g. the TOC). */
  markdown: string;
}

export interface Block {
  id: string;
  name: string;
  description: string;
  category: BlockCategory;
  build: (ctx: BlockContext) => string;
  /** Markup that must exist at the top of the document for this block to work. */
  topAnchor?: string;
}

const fence = (lang: string, lines: string[]) => ["```" + lang, ...lines, "```"].join("\n");

const names = (ctx: BlockContext) => {
  const [owner, name] = (ctx.repo ?? "owner/repo").split("/");
  return { owner, name, slug: `${owner}/${name}` };
};

const pm = (ctx: BlockContext) => ctx.profile?.packageManager ?? "npm";
const run = (ctx: BlockContext, script: string) => {
  const m = pm(ctx);
  return m === "npm" ? (script === "start" || script === "test" ? `npm ${script}` : `npm run ${script}`) : `${m} ${script}`;
};

// skillicons.dev ids for stack names the analyzer reports.
const SKILL_ICONS: Record<string, string> = {
  "Next.js": "nextjs",
  React: "react",
  TypeScript: "ts",
  JavaScript: "js",
  "Tailwind CSS": "tailwind",
  Express: "express",
  Vue: "vue",
  Nuxt: "nuxtjs",
  Svelte: "svelte",
  Astro: "astro",
  Angular: "angular",
  NestJS: "nestjs",
  Vite: "vite",
  GraphQL: "graphql",
  Electron: "electron",
  "Three.js": "threejs",
  Prisma: "prisma",
  "MongoDB (Mongoose)": "mongodb",
  MongoDB: "mongodb",
  PostgreSQL: "postgres",
  MySQL: "mysql",
  Redis: "redis",
  Supabase: "supabase",
  Firebase: "firebase",
  Docker: "docker",
  Jest: "jest",
  Python: "py",
  Django: "django",
  Flask: "flask",
  FastAPI: "fastapi",
  PyTorch: "pytorch",
  TensorFlow: "tensorflow",
  Go: "go",
  Rust: "rust",
  PHP: "php",
  Laravel: "laravel",
  Ruby: "ruby",
  "Ruby on Rails": "rails",
  Java: "java",
  "Spring Boot": "spring",
};

const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

/** "## " and "### " headings outside code fences. */
export const draftHeadings = (md: string): { depth: number; text: string }[] => {
  const out: { depth: number; text: string }[] = [];
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (m && !/table of contents|contents/i.test(m[2])) out.push({ depth: m[1].length, text: m[2] });
  }
  return out;
};

export const blocks: Block[] = [
  // ---- Start ----
  {
    id: "install",
    name: "Installation",
    description: "Clone, install and run, using the repo's package manager.",
    category: "Start",
    build: (ctx) => {
      const { name, slug } = names(ctx);
      const m = pm(ctx);
      const install =
        ctx.profile?.ecosystem === "python"
          ? ["pip install -r requirements.txt"]
          : ctx.profile?.ecosystem === "go"
            ? ["go mod download"]
            : ctx.profile?.ecosystem === "rust"
              ? ["cargo build --release"]
              : [`${m} install`];
      return ["## Installation", "", fence("bash", [`git clone https://github.com/${slug}.git`, `cd ${name}`, ...install]), ""].join("\n");
    },
  },
  {
    id: "quickstart",
    name: "Quick start",
    description: "The shortest path from zero to running.",
    category: "Start",
    build: (ctx) =>
      [
        "## Quick start",
        "",
        fence("bash", ctx.profile?.npmPackage ? [`npx ${ctx.profile.npmPackage}`] : [run(ctx, "dev")]),
        "",
        "Then open <http://localhost:3000>.",
        "",
      ].join("\n"),
  },
  {
    id: "usage",
    name: "Usage example",
    description: "A copy-pasteable code sample.",
    category: "Start",
    build: (ctx) => {
      const pkg = ctx.profile?.npmPackage ?? ctx.profile?.pypiPackage ?? names(ctx).name;
      const lang = ctx.profile?.ecosystem === "python" ? "python" : "js";
      const code =
        lang === "python"
          ? [`from ${pkg.replace(/-/g, "_")} import thing`, "", "result = thing(option=True)", "print(result)"]
          : [`import { thing } from "${pkg}";`, "", "const result = thing({ option: true });", "console.log(result);"];
      return ["## Usage", "", fence(lang, code), ""].join("\n");
    },
  },
  {
    id: "prereqs",
    name: "Prerequisites",
    description: "What to install before you start.",
    category: "Start",
    build: (ctx) => {
      const eco = ctx.profile?.ecosystem;
      const items =
        eco === "python"
          ? ["[Python](https://www.python.org/downloads/) 3.10+"]
          : eco === "go"
            ? ["[Go](https://go.dev/dl/) 1.21+"]
            : eco === "rust"
              ? ["[Rust](https://rustup.rs/)"]
              : ["[Node.js](https://nodejs.org/) 20+", ...(pm(ctx) === "pnpm" ? ["[pnpm](https://pnpm.io/installation)"] : [])];
      if (ctx.profile?.hasDocker) items.push("[Docker](https://docs.docker.com/get-docker/) (optional)");
      return ["## Prerequisites", "", ...items.map((i) => `- ${i}`), ""].join("\n");
    },
  },

  // ---- Reference ----
  {
    id: "env",
    name: "Environment variables",
    description: "Table of config vars, from .env.example when available.",
    category: "Reference",
    build: (ctx) => {
      const vars = ctx.profile?.envVars.length
        ? ctx.profile.envVars
        : [
            { key: "DATABASE_URL", comment: "Database connection string", example: "postgres://…" },
            { key: "API_KEY", comment: "Key for the external API", example: "" },
          ];
      return [
        "## Environment Variables",
        "",
        "| Variable | Description | Example |",
        "| --- | --- | --- |",
        ...vars.map((v) => `| \`${v.key}\` | ${v.comment ?? ""} | ${v.example ? `\`${v.example}\`` : ""} |`),
        "",
      ].join("\n");
    },
  },
  {
    id: "api",
    name: "API reference",
    description: "Function signature with an options table.",
    category: "Reference",
    build: () =>
      [
        "## API",
        "",
        "### `thing(options)`",
        "",
        "Does the thing and returns the result.",
        "",
        "| Option | Type | Default | Description |",
        "| --- | --- | --- | --- |",
        "| `option` | `boolean` | `false` | What this option controls. |",
        "| `timeout` | `number` | `5000` | Milliseconds before giving up. |",
        "",
      ].join("\n"),
  },
  {
    id: "cli",
    name: "CLI commands",
    description: "Table of commands and what they do.",
    category: "Reference",
    build: (ctx) =>
      [
        "## Commands",
        "",
        "| Command | Description |",
        "| --- | --- |",
        `| \`${run(ctx, "dev")}\` | Start the development server |`,
        `| \`${run(ctx, "build")}\` | Build for production |`,
        `| \`${run(ctx, "test")}\` | Run the test suite |`,
        "",
      ].join("\n"),
  },
  {
    id: "faq",
    name: "FAQ",
    description: "Collapsible questions and answers.",
    category: "Reference",
    build: () =>
      [
        "## FAQ",
        "",
        "<details>",
        "<summary><strong>Does it work on Windows?</strong></summary>",
        "",
        "Yes. Answer here.",
        "",
        "</details>",
        "",
        "<details>",
        "<summary><strong>How is this different from X?</strong></summary>",
        "",
        "Answer here.",
        "",
        "</details>",
        "",
      ].join("\n"),
  },
  {
    id: "roadmap",
    name: "Roadmap",
    description: "Task-list of what's done and what's next.",
    category: "Reference",
    build: () => ["## Roadmap", "", "- [x] Initial release", "- [ ] Next big feature", "- [ ] Documentation site", ""].join("\n"),
  },

  // ---- Visuals ----
  {
    id: "screenshots",
    name: "Screenshots",
    description: "Side-by-side image grid.",
    category: "Visuals",
    build: () =>
      [
        "## Screenshots",
        "",
        "| Home | Detail |",
        "| --- | --- |",
        "| ![Home screen](docs/screenshot-home.png) | ![Detail view](docs/screenshot-detail.png) |",
        "",
      ].join("\n"),
  },
  {
    id: "demo",
    name: "Demo GIF",
    description: "Centered demo image with a caption.",
    category: "Visuals",
    build: () =>
      ['<p align="center">', '  <img alt="Demo" src="docs/demo.gif" width="720">', "</p>", "", '<p align="center"><em>What the demo shows, in one line.</em></p>', ""].join("\n"),
  },
  {
    id: "stack-icons",
    name: "Tech stack icons",
    description: "Icon row from skillicons.dev, using the detected stack.",
    category: "Visuals",
    build: (ctx) => {
      const ids = (ctx.profile?.stack ?? []).map((s) => SKILL_ICONS[s]).filter(Boolean);
      const list = [...new Set(ids.length ? ids : ["ts", "react", "nextjs", "tailwind", "nodejs"])].join(",");
      return ["## Tech Stack", "", '<p align="left">', `  <img alt="Tech stack" src="https://skillicons.dev/icons?i=${list}" />`, "</p>", ""].join("\n");
    },
  },
  {
    id: "star-history",
    name: "Star history",
    description: "star-history.com chart for the repo.",
    category: "Visuals",
    build: (ctx) => {
      const { slug } = names(ctx);
      return [
        "## Star History",
        "",
        `[![Star History Chart](https://api.star-history.com/svg?repos=${slug}&type=Date)](https://star-history.com/#${slug}&Date)`,
        "",
      ].join("\n");
    },
  },
  {
    id: "contributors",
    name: "Contributors grid",
    description: "Avatar wall from contrib.rocks.",
    category: "Visuals",
    build: (ctx) => {
      const { slug } = names(ctx);
      return [
        "## Contributors",
        "",
        `<a href="https://github.com/${slug}/graphs/contributors">`,
        `  <img alt="Contributors" src="https://contrib.rocks/image?repo=${slug}" />`,
        "</a>",
        "",
      ].join("\n");
    },
  },

  // ---- Community ----
  {
    id: "contributing",
    name: "Contributing",
    description: "Fork-branch-PR steps, or a link to CONTRIBUTING.md.",
    category: "Community",
    build: (ctx) =>
      ctx.profile?.contributingPath
        ? ["## Contributing", "", `Contributions are welcome! Please read [the contributing guide](${ctx.profile.contributingPath}) first.`, ""].join("\n")
        : [
            "## Contributing",
            "",
            "Contributions are welcome!",
            "",
            "1. Fork the repository",
            "2. Create a branch: `git checkout -b feature/my-change`",
            "3. Commit your changes",
            "4. Open a pull request",
            "",
          ].join("\n"),
  },
  {
    id: "license",
    name: "License",
    description: "License statement, using the detected license.",
    category: "Community",
    build: (ctx) => {
      const lic = ctx.profile?.license?.name.replace(/^the\s+/i, "") ?? "MIT License";
      const path = ctx.profile?.licensePath ?? "LICENSE";
      return ["## License", "", `Distributed under the ${lic}. See [${path}](${path}) for details.`, ""].join("\n");
    },
  },
  {
    id: "acknowledgements",
    name: "Acknowledgements",
    description: "Credit the projects and people you built on.",
    category: "Community",
    build: () =>
      ["## Acknowledgements", "", "- [Project or person](https://example.com): what they made possible", "- [Another one](https://example.com)", ""].join("\n"),
  },
  {
    id: "support",
    name: "Support / Sponsor",
    description: "Ways to help: star, sponsor, share.",
    category: "Community",
    build: (ctx) => {
      const { owner, slug } = names(ctx);
      return [
        "## Support",
        "",
        `If this project helps you, consider giving it a ⭐ on [GitHub](https://github.com/${slug}) or [sponsoring @${owner}](https://github.com/sponsors/${owner}).`,
        "",
      ].join("\n");
    },
  },
  {
    id: "author",
    name: "Author",
    description: "Who made this and where to find them.",
    category: "Community",
    build: (ctx) => {
      const { owner } = names(ctx);
      return ["## Author", "", `**${owner}**`, "", `- GitHub: [@${owner}](https://github.com/${owner})`, ""].join("\n");
    },
  },

  // ---- Navigation ----
  {
    id: "toc",
    name: "Table of contents",
    description: "Generated from the headings in your draft.",
    category: "Navigation",
    build: (ctx) => {
      const hs = draftHeadings(ctx.markdown);
      if (!hs.length) return "## Table of Contents\n\n- [Section](#section)\n";
      return ["## Table of Contents", "", ...hs.map((h) => `${h.depth === 3 ? "  " : ""}- [${h.text}](#${slugify(h.text)})`), ""].join("\n");
    },
  },
  {
    id: "back-to-top",
    name: "Back to top",
    description: "Right-aligned link back to the top.",
    category: "Navigation",
    topAnchor: '<a id="readme-top"></a>',
    build: () => '<p align="right"><a href="#readme-top">↑ Back to top</a></p>\n',
  },
];
