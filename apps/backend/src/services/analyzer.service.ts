import type { RepoMeta, RepoSnapshot } from "./github.service.js";

export type Ecosystem = "node" | "python" | "go" | "rust" | "php" | "ruby" | "java" | "unknown";

export interface ProjectProfile {
  meta: RepoMeta;
  ecosystem: Ecosystem;
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "pip" | "poetry" | "uv" | "go" | "cargo" | "composer" | "bundler" | "maven" | "gradle" | null;
  /** Human-readable names, e.g. "Next.js", "Tailwind CSS". */
  stack: string[];
  /** npm scripts (or equivalents) worth documenting, in display order. */
  scripts: { name: string; command: string }[];
  envVars: { key: string; example: string; comment: string | null }[];
  /** Global CLI command names if the package ships a binary. */
  bins: string[];
  /** Published npm package name, when the root package is public. */
  npmPackage: string | null;
  isMonorepo: boolean;
  hasRequirementsTxt: boolean;
  workspaces: string[];
  hasTests: boolean;
  hasCI: boolean;
  /** First GitHub Actions workflow file name, for a status badge. */
  ciWorkflow: string | null;
  hasDocker: boolean;
  hasCompose: boolean;
  communityFiles: { contributing: boolean; codeOfConduct: boolean; security: boolean; license: boolean; changelog: boolean };
  /** Actual paths (casing matters for links), when present. */
  licensePath: string | null;
  contributingPath: string | null;
  /** Top-level directories, for a project-structure section. */
  topLevelDirs: string[];
}

const NODE_STACK: Record<string, string> = {
  next: "Next.js",
  react: "React",
  "react-native": "React Native",
  expo: "Expo",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  astro: "Astro",
  "@angular/core": "Angular",
  "solid-js": "SolidJS",
  "@remix-run/react": "Remix",
  electron: "Electron",
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
  hono: "Hono",
  koa: "Koa",
  "socket.io": "Socket.IO",
  graphql: "GraphQL",
  "@trpc/server": "tRPC",
  tailwindcss: "Tailwind CSS",
  "@mui/material": "Material UI",
  "framer-motion": "Framer Motion",
  three: "Three.js",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  "drizzle-orm": "Drizzle",
  mongoose: "MongoDB (Mongoose)",
  mongodb: "MongoDB",
  pg: "PostgreSQL",
  mysql2: "MySQL",
  redis: "Redis",
  ioredis: "Redis",
  "@supabase/supabase-js": "Supabase",
  firebase: "Firebase",
  stripe: "Stripe",
  openai: "OpenAI API",
  "@anthropic-ai/sdk": "Claude API",
  typescript: "TypeScript",
  vite: "Vite",
  turbo: "Turborepo",
  jest: "Jest",
  vitest: "Vitest",
  "@playwright/test": "Playwright",
  cypress: "Cypress",
};

const PYTHON_STACK: Record<string, string> = {
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  streamlit: "Streamlit",
  gradio: "Gradio",
  pandas: "pandas",
  numpy: "NumPy",
  torch: "PyTorch",
  tensorflow: "TensorFlow",
  "scikit-learn": "scikit-learn",
  langchain: "LangChain",
  sqlalchemy: "SQLAlchemy",
  pydantic: "Pydantic",
  celery: "Celery",
  pytest: "pytest",
};

const GO_STACK: Record<string, string> = {
  "github.com/gin-gonic/gin": "Gin",
  "github.com/gofiber/fiber": "Fiber",
  "github.com/labstack/echo": "Echo",
  "github.com/gorilla/mux": "Gorilla Mux",
  "github.com/spf13/cobra": "Cobra",
  "gorm.io/gorm": "GORM",
};

const RUST_STACK: Record<string, string> = {
  tokio: "Tokio",
  axum: "Axum",
  "actix-web": "Actix Web",
  rocket: "Rocket",
  serde: "Serde",
  clap: "clap",
  bevy: "Bevy",
  tauri: "Tauri",
};

const LANGUAGE_LABEL: Partial<Record<Ecosystem, string>> = {
  python: "Python",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  ruby: "Ruby",
  java: "Java",
};

// Scripts worth showing, in the order a newcomer would run them.
const SCRIPT_ORDER = ["dev", "start", "build", "test", "lint", "format", "typecheck", "preview"];

interface PackageJson {
  name?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  bin?: string | Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

const parseJson = <T>(text: string | undefined): T | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const addStack = (stack: Set<string>, deps: Iterable<string>, table: Record<string, string>) => {
  for (const dep of deps) {
    const hit = table[dep] ?? Object.entries(table).find(([k]) => dep.startsWith(k + "/"))?.[1];
    if (hit) stack.add(hit);
  }
};

export const parseEnvExample = (text: string): ProjectProfile["envVars"] => {
  const vars: ProjectProfile["envVars"] = [];
  let pendingComment: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      pendingComment = null;
      continue;
    }
    if (line.startsWith("#")) {
      pendingComment = line.replace(/^#+\s*/, "") || null;
      continue;
    }
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      vars.push({ key: m[1], example: m[2].replace(/^["']|["']$/g, ""), comment: pendingComment });
      pendingComment = null;
    }
  }
  return vars;
};

export const analyzeRepo = (snapshot: RepoSnapshot): ProjectProfile => {
  const { paths, files, meta } = snapshot;
  const has = (p: string) => paths.includes(p);
  const lower = paths.map((p) => p.toLowerCase());
  const stack = new Set<string>();

  let ecosystem: Ecosystem = "unknown";
  let packageManager: ProjectProfile["packageManager"] = null;
  let scripts: ProjectProfile["scripts"] = [];
  let bins: string[] = [];
  let npmPackage: string | null = null;
  let workspaces: string[] = [];

  const rootPkg = parseJson<PackageJson>(files["package.json"]);
  if (rootPkg) {
    ecosystem = "node";
    packageManager = has("pnpm-lock.yaml")
      ? "pnpm"
      : has("yarn.lock")
        ? "yarn"
        : has("bun.lockb") || has("bun.lock")
          ? "bun"
          : "npm";

    // Collect deps from the root and any workspace manifests we fetched.
    const manifests = Object.entries(files)
      .filter(([path]) => path.endsWith("package.json"))
      .map(([path, text]) => [path, parseJson<PackageJson>(text)] as const);
    for (const [, pkg] of manifests) {
      if (!pkg) continue;
      addStack(stack, Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }), NODE_STACK);
    }

    const rootScripts = rootPkg.scripts ?? {};
    scripts = SCRIPT_ORDER.filter((s) => rootScripts[s] && !/no test specified/.test(rootScripts[s])).map((name) => ({
      name,
      command: rootScripts[name],
    }));

    bins = typeof rootPkg.bin === "string" ? [rootPkg.name ?? meta.name] : Object.keys(rootPkg.bin ?? {});
    if (rootPkg.name && !rootPkg.private) npmPackage = rootPkg.name;

    const ws = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : rootPkg.workspaces?.packages;
    workspaces = ws ?? [];
    if (!workspaces.length && files["pnpm-workspace.yaml"]) {
      workspaces = [...files["pnpm-workspace.yaml"].matchAll(/^\s*-\s*["']?([^"'\n]+)["']?\s*$/gm)].map((m) => m[1]);
    }
    if (!workspaces.length) {
      workspaces = manifests.map(([p]) => p).filter((p) => p !== "package.json").map((p) => p.replace(/\/package\.json$/, ""));
    }
  } else if (files["pyproject.toml"] || files["requirements.txt"] || files["setup.py"]) {
    ecosystem = "python";
    const pyproject = files["pyproject.toml"] ?? "";
    packageManager = has("uv.lock") ? "uv" : has("poetry.lock") || /\[tool\.poetry\]/.test(pyproject) ? "poetry" : "pip";
    const depText = `${files["requirements.txt"] ?? ""}\n${pyproject}`.toLowerCase();
    const deps = [...depText.matchAll(/^\s*["']?([a-z0-9][a-z0-9._-]*)/gm)].map((m) => m[1]);
    addStack(stack, deps, PYTHON_STACK);
  } else if (files["go.mod"]) {
    ecosystem = "go";
    packageManager = "go";
    addStack(stack, [...files["go.mod"].matchAll(/^\s*([\w.-]+\.[\w./-]+)\s+v/gm)].map((m) => m[1]), GO_STACK);
  } else if (files["Cargo.toml"]) {
    ecosystem = "rust";
    packageManager = "cargo";
    addStack(stack, [...files["Cargo.toml"].matchAll(/^\s*([a-z0-9_-]+)\s*=/gm)].map((m) => m[1]), RUST_STACK);
  } else if (files["composer.json"]) {
    ecosystem = "php";
    packageManager = "composer";
    const composer = parseJson<{ require?: Record<string, string> }>(files["composer.json"]);
    if (composer?.require?.["laravel/framework"]) stack.add("Laravel");
    if (Object.keys(composer?.require ?? {}).some((d) => d.startsWith("symfony/"))) stack.add("Symfony");
  } else if (files["Gemfile"]) {
    ecosystem = "ruby";
    packageManager = "bundler";
    if (/gem ["']rails["']/.test(files["Gemfile"])) stack.add("Ruby on Rails");
  } else if (files["pom.xml"] || files["build.gradle"]) {
    ecosystem = "java";
    packageManager = files["pom.xml"] ? "maven" : "gradle";
    if (/spring-boot/.test(files["pom.xml"] ?? files["build.gradle"] ?? "")) stack.add("Spring Boot");
  }

  const langLabel = LANGUAGE_LABEL[ecosystem];
  if (langLabel) stack.add(langLabel);
  if (ecosystem === "node" && !stack.has("TypeScript")) stack.add("JavaScript");

  const hasDocker = has("Dockerfile");
  const hasCompose = has("docker-compose.yml") || has("compose.yml");
  if (hasDocker || hasCompose) stack.add("Docker");

  const ciWorkflow =
    paths.find((p) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(p))?.replace(".github/workflows/", "") ?? null;

  const envFile = files[".env.example"] ?? files[".env.sample"];

  return {
    meta,
    ecosystem,
    packageManager,
    stack: [...stack],
    scripts,
    envVars: envFile ? parseEnvExample(envFile) : [],
    bins,
    npmPackage,
    isMonorepo: workspaces.length > 0,
    hasRequirementsTxt: files["requirements.txt"] !== undefined,
    workspaces,
    hasTests:
      lower.some((p) => /(^|\/)(__tests__|tests?|spec)\//.test(p) || /\.(test|spec)\.[a-z]+$/.test(p) || /(^|\/)test_[^/]+\.py$/.test(p)) ||
      scripts.some((s) => s.name === "test"),
    hasCI: ciWorkflow !== null,
    ciWorkflow,
    hasDocker,
    hasCompose,
    licensePath: paths.find((p) => /^licen[cs]e(\.md|\.txt)?$/i.test(p)) ?? null,
    contributingPath: paths.find((p) => /^(\.github\/|docs\/)?contributing(\.md)?$/i.test(p)) ?? null,
    communityFiles: {
      contributing: lower.some((p) => /(^|\.github\/|docs\/)contributing(\.md)?$/.test(p)),
      codeOfConduct: lower.some((p) => /(^|\.github\/|docs\/)code_of_conduct(\.md)?$/.test(p)),
      security: lower.some((p) => /(^|\.github\/|docs\/)security(\.md)?$/.test(p)),
      license: Boolean(meta.license) || lower.some((p) => /^licen[cs]e(\.md|\.txt)?$/.test(p)),
      changelog: lower.some((p) => /^changelog(\.md)?$/.test(p)),
    },
    topLevelDirs: [...new Set(paths.filter((p) => p.includes("/")).map((p) => p.split("/")[0]))]
      .filter((d) => !d.startsWith("."))
      .sort(),
  };
};
