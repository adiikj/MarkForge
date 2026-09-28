"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, FileText, GitBranch, LayoutDashboard, MailWarning, Menu, Plus, Settings, X } from "lucide-react";
import Logo from "../Logo";
import UserMenu from "./UserMenu";
import { btn, Skeleton } from "./ui";
import { useAuth } from "../../lib/auth";
import { authApi } from "../../lib/account";
import { useToast } from "../../lib/toast";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/repos", label: "Repos", icon: GitBranch },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const PLAN_LABEL = { FREE: "Free", PRO: "Pro", TEAM: "Team" } as const;

const DashboardShell = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [drawer, setDrawer] = useState(false);
  const [sending, setSending] = useState(false);

  // The middleware only checks for a cookie; this catches expired/revoked sessions.
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);
  useEffect(() => setDrawer(false), [pathname]);

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast(`Verification link sent to ${user?.email}.`);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSending(false);
    }
  };

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-4" aria-label="Dashboard">
      <Link href="/" className="mb-6 px-2 pt-1" aria-label="MarkForge home">
        <Logo />
      </Link>
      <Link href="/generate" className={`${btn.primary} mb-4 w-full`}>
        <Plus className="h-4 w-4" /> New README
      </Link>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
            isActive(href) ? "bg-white/[0.08] text-white" : "text-neutral-400 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
      <div className="mt-auto shrink-0 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-4">
        <p className="text-xs text-neutral-500">Current plan</p>
        <p className="mt-0.5 font-medium">{user ? PLAN_LABEL[user.plan] : "…"}</p>
        {user?.plan === "FREE" && (
          <Link href="/pricing" className="mt-3 block text-xs text-neutral-300 underline-offset-4 hover:text-white hover:underline">
            See what Pro adds →
          </Link>
        )}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-white">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/[0.07] bg-[#070707] lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDrawer(false)} />
          <aside className="animate-fade-up absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-[#070707]">
            <button onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-2 text-neutral-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/[0.07] bg-[#050505]/80 px-5 backdrop-blur-xl md:px-8">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-lg p-2 text-neutral-400 hover:bg-white/5 hover:text-white lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="lg:hidden" aria-label="MarkForge home">
            <Logo markClassName="h-7 w-7" />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/health" className={`${btn.ghost} hidden sm:inline-flex`}>
              Health Score
            </Link>
            <Link href="/generate" className={`${btn.ghost} hidden sm:inline-flex`}>
              Studio
            </Link>
            {user ? <UserMenu /> : <Skeleton className="h-[34px] w-[34px] rounded-full" />}
          </div>
        </header>

        {user && !user.emailVerified && (
          <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] bg-white/[0.03] px-5 py-2.5 text-sm md:px-8">
            <MailWarning className="h-4 w-4 shrink-0 text-neutral-300" />
            <span className="text-neutral-300">
              Confirm <span className="text-white">{user.email}</span> to secure your account.
            </span>
            <button onClick={resend} disabled={sending} className="text-white underline underline-offset-4 disabled:opacity-50">
              {sending ? "Sending…" : "Resend link"}
            </button>
          </div>
        )}

        <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
          {loading || !user ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-56" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
              <Skeleton className="h-64" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
