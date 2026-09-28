import { LayoutTemplate, PencilLine, Download } from "lucide-react";

const steps = [
  {
    icon: LayoutTemplate,
    title: "Pick a starting point",
    description: "Choose a template, or paste a repo link and let MarkForge draft it.",
  },
  {
    icon: PencilLine,
    title: "Shape it live",
    description: "Edit the Markdown and see a GitHub-accurate preview update beside it.",
  },
  {
    icon: Download,
    title: "Ship it",
    description: "Download the .md file or copy it straight into your repo.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-[#050505] py-24 text-white md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">How it works</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            From blank page to
            <span className="text-neutral-500"> pushed</span>, in minutes.
          </h2>
        </div>

        <div className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* Connector line */}
          <div className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-gradient-to-r from-white/5 via-white/25 to-white/5 md:block" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-[#0b0b0b] shadow-[0_0_30px_-10px_rgba(255,255,255,0.3)]">
                  <Icon className="h-6 w-6 text-neutral-200" />
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white font-mono text-[10px] font-semibold text-black">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-medium">{step.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
