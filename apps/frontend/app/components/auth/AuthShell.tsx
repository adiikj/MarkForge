import { FC, ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import Logo from "../Logo";
import Aurora from "../landingPage/Aurora";

const points = [
  "AI-written READMEs grounded in your real code",
  "Health scores with one-click fixes",
  "Docs packs, changelogs, badges and diagrams",
  "Your drafts and repos, synced across devices",
];

/** Split layout for every auth page: brand panel on the left (desktop), form on the right. */
const AuthShell: FC<{ title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }> = ({
  title,
  subtitle,
  children,
  footer,
}) => (
  <div className="relative grid min-h-screen bg-[#050505] font-sans text-white lg:grid-cols-[1.05fr_1fr]">
    {/* Brand panel */}
    <aside className="relative hidden overflow-hidden border-r border-white/[0.06] lg:block">
      <div className="absolute inset-0 [&>.aurora]:absolute">
        <Aurora />
      </div>
      <div className="relative z-10 flex h-full flex-col justify-between p-12">
        <Link href="/" aria-label="MarkForge home" className="w-fit">
          <Logo />
        </Link>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">The Markdown toolkit</p>
          <h2 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Docs your repo deserves,
            <span className="text-neutral-500"> in minutes.</span>
          </h2>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <Check className="h-3 w-3" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-neutral-600">&copy; {new Date().getFullYear()} MarkForge</p>
      </div>
    </aside>

    {/* Form */}
    <main className="relative flex flex-col px-5 py-8 sm:px-10">
      <Link href="/" aria-label="MarkForge home" className="w-fit lg:hidden">
        <Logo />
      </Link>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-neutral-400">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 text-center text-sm text-neutral-500">{footer}</div>}
      </div>
    </main>
  </div>
);

export default AuthShell;
