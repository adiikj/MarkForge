import type { ProjectProfile } from "./analyzer.service.js";
import { stackFromPackageJson } from "./analyzer.service.js";
import type { RepoSnapshot } from "./github.service.js";

const LAYERS: { id: string; title: string; members: string[] }[] = [
  {
    id: "ui",
    title: "Client",
    members: ["Next.js", "React", "React Native", "Expo", "Vue", "Nuxt", "Svelte", "SvelteKit", "Astro", "Angular", "SolidJS", "Remix", "Electron", "Tailwind CSS", "Material UI", "Framer Motion", "Three.js", "Streamlit", "Gradio"],
  },
  {
    id: "api",
    title: "Server",
    members: ["Express", "Fastify", "NestJS", "Hono", "Koa", "Socket.IO", "GraphQL", "tRPC", "Django", "Flask", "FastAPI", "Gin", "Fiber", "Echo", "Gorilla Mux", "Axum", "Actix Web", "Rocket", "Laravel", "Symfony", "Ruby on Rails", "Spring Boot", "Celery"],
  },
  {
    id: "data",
    title: "Data",
    members: ["Prisma", "Drizzle", "MongoDB (Mongoose)", "MongoDB", "PostgreSQL", "MySQL", "Redis", "Supabase", "Firebase", "SQLAlchemy", "GORM", "pandas", "NumPy"],
  },
  { id: "ext", title: "External services", members: ["Stripe", "OpenAI API", "Claude API", "LangChain"] },
];

const layerOf = (tech: string) => LAYERS.find((l) => l.members.includes(tech))?.id ?? null;

/** Mermaid-safe node id. */
const nid = (s: string) => "n_" + s.replace(/[^A-Za-z0-9]/g, "_");
/** Mermaid-safe quoted label. */
const q = (s: string) => `"${s.replace(/"/g, "'")}"`;

// No %%{init}%% theme: GitHub picks light/dark Mermaid styling to match each viewer.
const header: string[] = [];

export const architectureDiagram = (snapshot: RepoSnapshot, profile: ProjectProfile): string => {
  const lines = [...header, "flowchart LR", `  user([User])`];

  // Monorepo: one subgraph per workspace manifest, with its own stack.
  const workspaces = Object.entries(snapshot.files)
    .filter(([path]) => path.endsWith("/package.json"))
    .map(([path, text]) => ({ dir: path.replace(/\/package\.json$/, ""), stack: stackFromPackageJson(text) }))
    .filter((w) => w.stack.length);

  if (workspaces.length >= 2) {
    const kindOf = (stack: string[]) =>
      stack.some((t) => layerOf(t) === "ui") ? "ui" : stack.some((t) => layerOf(t) === "api") ? "api" : "lib";
    for (const w of workspaces) {
      lines.push(`  subgraph ${nid(w.dir)}[${q(w.dir)}]`);
      for (const t of w.stack.filter((t) => layerOf(t) !== "data" && layerOf(t) !== "ext").slice(0, 6)) {
        lines.push(`    ${nid(w.dir + t)}[${q(t)}]`);
      }
      lines.push("  end");
    }
    const uis = workspaces.filter((w) => kindOf(w.stack) === "ui");
    const apis = workspaces.filter((w) => kindOf(w.stack) === "api");
    for (const u of uis) lines.push(`  user --> ${nid(u.dir)}`);
    for (const u of uis) for (const a of apis) lines.push(`  ${nid(u.dir)} -->|HTTP| ${nid(a.dir)}`);
    const dataTech = [...new Set(workspaces.flatMap((w) => w.stack.filter((t) => layerOf(t) === "data")))];
    for (const d of dataTech) {
      lines.push(`  ${nid(d)}[(${q(d)})]`);
      for (const w of workspaces.filter((w) => w.stack.includes(d))) lines.push(`  ${nid(w.dir)} --> ${nid(d)}`);
    }
    if (!uis.length) lines.push(`  user --> ${nid(workspaces[0].dir)}`);
    return lines.join("\n") + "\n";
  }

  // Single package: group detected tech into layers.
  const present = LAYERS.map((l) => ({ ...l, tech: profile.stack.filter((t) => l.members.includes(t)) })).filter((l) => l.tech.length);
  if (!present.length) {
    lines.push(`  app[${q(profile.meta.name)}]`, "  user --> app");
    return lines.join("\n") + "\n";
  }
  for (const l of present) {
    lines.push(`  subgraph ${l.id}[${q(l.title)}]`);
    for (const t of l.tech) lines.push(`    ${nid(t)}${l.id === "data" ? `[(${q(t)})]` : `[${q(t)}]`}`);
    lines.push("  end");
  }
  const order = present.map((l) => l.id).filter((id) => id !== "ext");
  lines.push(`  user --> ${order[0]}`);
  for (let i = 1; i < order.length; i++) lines.push(`  ${order[i - 1]} --> ${order[i]}`);
  if (present.some((l) => l.id === "ext")) lines.push(`  ${order.includes("api") ? "api" : order[0]} -.-> ext`);
  return lines.join("\n") + "\n";
};

const MAX_CHILDREN = 8;
const MAX_NODES = 45;
const MAX_DEPTH = 3;

export const structureDiagram = (snapshot: RepoSnapshot): string => {
  const skip = (seg: string) => seg.startsWith(".") || ["node_modules", "dist", "build", "vendor", "__pycache__"].includes(seg);
  const children = new Map<string, Set<string>>([["", new Set()]]);
  for (const p of snapshot.paths) {
    const segs = p.split("/").slice(0, -1);
    for (let i = 1; i <= Math.min(segs.length, MAX_DEPTH); i++) {
      if (skip(segs[i - 1])) break;
      const parent = segs.slice(0, i - 1).join("/");
      const dir = segs.slice(0, i).join("/");
      if (!children.has(parent)) children.set(parent, new Set());
      children.get(parent)!.add(dir);
    }
  }

  const lines = [...header, "flowchart LR", `  root[${q(snapshot.meta.name + "/")}]`];
  const idOf = (dir: string) => (dir ? nid(dir) : "root");
  // Breadth-first so the node budget is spent on shallow levels before deep ones.
  const queue = [""];
  let count = 0;
  while (queue.length && count < MAX_NODES) {
    const dir = queue.shift()!;
    const kids = [...(children.get(dir) ?? [])].sort();
    for (const k of kids.slice(0, MAX_CHILDREN)) {
      if (count >= MAX_NODES) break;
      lines.push(`  ${idOf(dir)} --> ${nid(k)}[${q(k.split("/").pop() + "/")}]`);
      count++;
      queue.push(k);
    }
    if (kids.length > MAX_CHILDREN) lines.push(`  ${idOf(dir)} --> ${nid(dir + "_more")}[${q(`+${kids.length - MAX_CHILDREN} more`)}]`);
  }
  return lines.join("\n") + "\n";
};
