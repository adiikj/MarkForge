import { FC } from "react";
import Link from "next/link";
import { ArrowRight, Check, Star, GitFork } from "lucide-react";

// Markdown source shown in the left pane. Each token is [className, text].
const sourceLines: [string, string][][] = [
  [["text-white font-semibold", "# "], ["text-white font-semibold", "orbit-cli"]],
  [["text-neutral-500", "> "], ["text-neutral-400", "Ship dotfiles across machines in one command."]],
  [],
  [["text-neutral-500", "![ci]("], ["text-neutral-600", "shields.io/ci"], ["text-neutral-500", ") ![npm]("], ["text-neutral-600", "…"], ["text-neutral-500", ")"]],
  [],
  [["text-white font-semibold", "## "], ["text-white font-semibold", "Install"]],
  [["text-neutral-500", "```"], ["text-neutral-600", "bash"]],
  [["text-neutral-300", "npm i -g orbit-cli"]],
  [["text-neutral-500", "```"]],
  [],
  [["text-white font-semibold", "## "], ["text-white font-semibold", "Features"]],
  [["text-neutral-500", "- "], ["text-neutral-300", "**Zero config** sync"]],
  [["text-neutral-500", "- "], ["text-neutral-300", "Works offline"]],
];

const Hero: FC = () => {
  return (
    <section className="relative overflow-hidden text-white">
      {/* Backdrop: grid + soft glow */}
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.07] blur-[120px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pb-24 pt-20 text-center md:px-8 md:pt-28">
        {/* Announcement pill */}
        <a
          href="#toolkit"
          className="animate-fade-up group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-xs text-neutral-400 transition-colors hover:border-white/20 hover:text-neutral-200"
        >
          <span className="rounded-full bg-white px-2 py-0.5 font-medium text-black">New</span>
          New: Changelogs, tables, diagrams and converters
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </a>

        {/* Headline */}
        <h1 className="animate-fade-up mt-8 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tighter [animation-delay:80ms] md:text-7xl">
          Forge Markdown
          <br />
          <span className="text-shimmer animate-shimmer">that ships.</span>
        </h1>

        <p className="animate-fade-up mt-6 max-w-xl text-base text-neutral-400 [animation-delay:160ms] md:text-lg">
          Profile READMEs, project docs, badges and changelogs. Write less
          boilerplate and get docs that look like you meant them.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up mt-9 flex flex-col items-center gap-3 [animation-delay:240ms] sm:flex-row">
          <Link
            href="/generate"
            className="group flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-medium text-black shadow-[0_0_40px_-8px_rgba(255,255,255,0.5)] transition-all hover:bg-neutral-200"
          >
            Start forging
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#toolkit"
            className="rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-neutral-300 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
          >
            Explore the toolkit
          </a>
        </div>

        <p className="animate-fade-up mt-5 flex items-center gap-4 text-xs text-neutral-500 [animation-delay:300ms]">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Free</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> No sign-up</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> GitHub-flavored</span>
        </p>

        {/* Editor mockup */}
        <div className="animate-fade-up relative mt-16 w-full max-w-5xl [animation-delay:400ms]">
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] text-left shadow-2xl shadow-black">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="ml-3 font-mono text-xs text-neutral-500">README.md</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Source pane */}
              <div className="min-w-0 border-b border-white/10 p-5 font-mono text-[12.5px] leading-6 md:border-b-0 md:border-r">
                {sourceLines.map((tokens, i) => (
                  <div key={i} className="flex min-w-0">
                    <span className="mr-4 w-5 shrink-0 select-none text-right text-neutral-700">{i + 1}</span>
                    <span className="truncate">
                      {tokens.map(([cls, text], j) => (
                        <span key={j} className={cls}>{text}</span>
                      ))}
                      {i === sourceLines.length - 1 && (
                        <span className="animate-blink ml-0.5 inline-block h-4 w-[7px] translate-y-0.5 bg-white" />
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rendered pane */}
              <div className="min-w-0 p-6">
                <h3 className="border-b border-white/10 pb-2 text-2xl font-semibold">orbit-cli</h3>
                <p className="mt-3 border-l-2 border-white/20 pl-3 text-sm text-neutral-400">
                  Ship dotfiles across machines in one command.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px]">
                  <span className="flex overflow-hidden rounded">
                    <span className="bg-neutral-700 px-1.5 py-0.5 text-neutral-200">ci</span>
                    <span className="bg-neutral-300 px-1.5 py-0.5 text-black">passing</span>
                  </span>
                  <span className="flex overflow-hidden rounded">
                    <span className="bg-neutral-700 px-1.5 py-0.5 text-neutral-200">npm</span>
                    <span className="bg-white px-1.5 py-0.5 text-black">v2.4.0</span>
                  </span>
                  <span className="flex items-center gap-1 rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
                    <Star className="h-2.5 w-2.5" /> 1.2k
                  </span>
                  <span className="flex items-center gap-1 rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
                    <GitFork className="h-2.5 w-2.5" /> 86
                  </span>
                </div>
                <h4 className="mt-5 border-b border-white/10 pb-1.5 text-lg font-semibold">Install</h4>
                <pre className="mt-3 rounded-lg border border-white/10 bg-black px-3 py-2.5 font-mono text-xs text-neutral-300">
                  <span className="text-neutral-600">$ </span>npm i -g orbit-cli
                </pre>
                <h4 className="mt-5 border-b border-white/10 pb-1.5 text-lg font-semibold">Features</h4>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-300 marker:text-neutral-600">
                  <li><strong className="text-white">Zero config</strong> sync</li>
                  <li>Works offline</li>
                </ul>
              </div>
            </div>
          </div>
          {/* Fade into page */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-px h-24 bg-gradient-to-t from-[#050505] to-transparent" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
