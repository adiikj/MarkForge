import { FC, ReactNode } from "react";
import Link from "next/link";
import {
  UserRound,
  GitBranch,
  BadgeCheck,
  LayoutGrid,
  Files,
  History,
  Table2,
  Workflow,
  Repeat,
  Gauge,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

type Tool = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: "live" | "soon";
  href?: string;
  className?: string;
  visual?: ReactNode;
};

const StatusPill: FC<{ status: Tool["status"] }> = ({ status }) =>
  status === "live" ? (
    <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
      Live
    </span>
  ) : (
    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-neutral-500">Soon</span>
  );

const RepoVisual = (
  <div className="mt-6 rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-xs">
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-neutral-400">
      <GitBranch className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">github.com/you/awesome-project</span>
      <span className="ml-auto shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-sans font-medium text-black">Forge</span>
    </div>
    <div className="mt-3 space-y-1.5 pl-1 text-neutral-500">
      <p><span className="text-neutral-300">✓</span> Read package.json, 3 scripts</p>
      <p><span className="text-neutral-300">✓</span> Detected Next.js, Tailwind, Prisma</p>
      <p><span className="text-neutral-300">✓</span> Found .env.example, 4 vars</p>
      <p className="text-neutral-300">→ README.md drafted</p>
    </div>
  </div>
);

const BadgeVisual = (
  <div className="mt-6 flex flex-wrap gap-1.5 font-mono text-[10px]">
    {[
      ["build", "passing"],
      ["license", "MIT"],
      ["coverage", "94%"],
      ["npm", "v1.0.3"],
      ["PRs", "welcome"],
    ].map(([k, v]) => (
      <span key={k} className="flex overflow-hidden rounded">
        <span className="bg-neutral-800 px-1.5 py-0.5 text-neutral-400">{k}</span>
        <span className="bg-neutral-300 px-1.5 py-0.5 text-black">{v}</span>
      </span>
    ))}
  </div>
);

const BlocksVisual = (
  <div className="mt-6 grid grid-cols-3 gap-1.5 text-[10px] text-neutral-500">
    {["Install", "Usage", "API", "FAQ", "Stack", "Contrib"].map((b, i) => (
      <div
        key={b}
        className={`rounded-md border px-2 py-1.5 text-center ${
          i === 1 ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-white/[0.02]"
        }`}
      >
        {b}
      </div>
    ))}
  </div>
);

const tools: Tool[] = [
  {
    icon: UserRound,
    title: "README Studio",
    description: "Profile and project templates, a live GitHub-style preview, autosave and one-click download.",
    status: "live",
    href: "/generate",
    className: "md:col-span-2",
    visual: (
      <div className="mt-6 flex items-end gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full border border-white/20 bg-gradient-to-br from-neutral-600 to-neutral-900" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-2/5 rounded bg-white/70" />
          <div className="h-2 w-4/5 rounded bg-white/15" />
          <div className="h-2 w-3/5 rounded bg-white/10" />
        </div>
        <div className="hidden gap-1 sm:flex">
          {[40, 65, 30, 80, 55, 90, 45].map((h, i) => (
            <div key={i} className="w-2 rounded-sm bg-white/20" style={{ height: `${h * 0.5}px` }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: GitBranch,
    title: "Repo → README",
    description: "Paste a repo link. AI reads the code and writes the whole README, grounded in your real commands.",
    status: "live",
    href: "/generate",
    className: "md:row-span-2",
    visual: RepoVisual,
  },
  {
    icon: Gauge,
    title: "README Health Score",
    description: "Score any README out of 100 across 15 checks, then fix the gaps in one click.",
    status: "live",
    href: "/health",
    className: "md:col-span-2",
  },
  {
    icon: BadgeCheck,
    title: "Badge Builder",
    description: "Auto-detects CI, license, package and coverage badges for your repo.",
    status: "live",
    href: "/badges",
    visual: BadgeVisual,
  },
  {
    icon: LayoutGrid,
    title: "Section Blocks",
    description: "Drag in ready-made sections instead of starting from a blank page.",
    status: "live",
    href: "/blocks",
    visual: BlocksVisual,
  },
  {
    icon: Files,
    title: "Repo Docs Pack",
    description: "CONTRIBUTING, SECURITY, Code of Conduct and issue templates from a single repo scan.",
    status: "live",
    href: "/docs-pack",
  },
  {
    icon: History,
    title: "Changelog Generator",
    description: "Pick two tags and get grouped release notes: features, fixes, breaking changes.",
    status: "live",
    href: "/changelog",
  },
  {
    icon: Table2,
    title: "Table Editor",
    description: "Edit in a spreadsheet grid and export aligned Markdown tables. Paste CSV straight in.",
    status: "live",
    href: "/table",
  },
  {
    icon: Workflow,
    title: "Mermaid Diagrams",
    description: "Live Mermaid editor, plus architecture diagrams generated from your repo.",
    status: "live",
    href: "/diagrams",
  },
  {
    icon: Repeat,
    title: "Converters",
    description: "HTML, Notion, Docs and CSV to clean Markdown, and Markdown back out to PDF or HTML.",
    status: "live",
    href: "/convert",
    className: "md:col-span-3",
    visual: (
      <div className="mt-6 flex flex-wrap items-center gap-2 font-mono text-[11px] text-neutral-500">
        {[".html", ".csv", "notion", ".docx"].map((f) => (
          <span key={f} className="rounded-md border border-white/10 px-2 py-1">{f}</span>
        ))}
        <span className="px-1 text-neutral-300">⇄</span>
        <span className="rounded-md border border-white/30 bg-white/10 px-2 py-1 text-white">.md</span>
        <span className="px-1 text-neutral-300">⇄</span>
        {[".pdf", ".html"].map((f) => (
          <span key={f + "o"} className="rounded-md border border-white/10 px-2 py-1">{f}</span>
        ))}
      </div>
    ),
  },
];

const ToolCard: FC<{ tool: Tool }> = ({ tool }) => {
  const Icon = tool.icon;
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
          <Icon className="h-5 w-5 text-neutral-200" />
        </div>
        <StatusPill status={tool.status} />
      </div>
      <h3 className="mt-5 flex items-center gap-1.5 text-lg font-medium text-white">
        {tool.title}
        {tool.href && (
          <ArrowUpRight className="h-4 w-4 text-neutral-500 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
        )}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">{tool.description}</p>
      {tool.visual}
    </>
  );

  const cls = `group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-colors hover:border-white/20 ${tool.className ?? ""}`;

  return tool.href ? (
    <Link href={tool.href} className={cls}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const Toolkit: FC = () => {
  return (
    <section id="toolkit" className="scroll-mt-20 py-24 text-white md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">The toolkit</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Everything Markdown,
            <span className="text-neutral-500"> in one forge.</span>
          </h2>
          <p className="mt-5 text-neutral-400">
            It began as a README generator. Now it drafts READMEs from your code, scores them,
            and is growing to cover the rest of the docs your repo needs.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.title} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Toolkit;
