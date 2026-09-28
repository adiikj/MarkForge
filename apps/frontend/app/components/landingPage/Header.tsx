"use client";

import { useEffect, useRef, useState, FC } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Files,
  Gauge,
  History,
  LayoutGrid,
  Menu,
  PencilLine,
  Repeat,
  Table2,
  Workflow,
  X,
} from "lucide-react";
import Logo from "../Logo";
import UserMenu from "../dashboard/UserMenu";
import { useAuth } from "../../lib/auth";

const tools = [
  { href: "/generate", label: "README Studio", description: "Templates, repo drafts, live preview", icon: PencilLine },
  { href: "/blocks", label: "Section Blocks", description: "Ready-made sections, filled from your repo", icon: LayoutGrid },
  { href: "/health", label: "Health Score", description: "Score and fix any README", icon: Gauge },
  { href: "/badges", label: "Badge Builder", description: "Badges detected from your repo", icon: BadgeCheck },
  { href: "/docs-pack", label: "Repo Docs Pack", description: "CONTRIBUTING, SECURITY, templates", icon: Files },
  { href: "/changelog", label: "Changelog", description: "Release notes from commits and PRs", icon: History },
  { href: "/table", label: "Table Editor", description: "Spreadsheet grid to Markdown table", icon: Table2 },
  { href: "/diagrams", label: "Mermaid Diagrams", description: "Live editor and repo architecture", icon: Workflow },
  { href: "/convert", label: "Converters", description: "Docs, Notion, HTML, CSV to Markdown", icon: Repeat },
];

const navLinks = [
  { href: "/#toolkit", label: "Toolkit" },
  { href: "/pricing", label: "Pricing" },
];

const Header: FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { user, loading } = useAuth();
  const toolsRef = useRef<HTMLDivElement>(null);

  // Close the Tools menu on outside click or Escape.
  useEffect(() => {
    if (!toolsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!toolsRef.current?.contains(e.target as Node)) setToolsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setToolsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full text-white transition-all duration-300 ${
        scrolled || isOpen
          ? "border-b border-white/10 bg-black/70 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        {/* Logo */}
        <Link href="/" aria-label="MarkForge home">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1.5 md:flex">
          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setToolsOpen((o) => !o)}
              aria-expanded={toolsOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-sm transition-colors hover:bg-white/[0.06] hover:text-white ${
                toolsOpen ? "bg-white/[0.06] text-white" : "text-neutral-400"
              }`}
            >
              Tools <ChevronDown className={`h-3.5 w-3.5 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
            </button>
            {toolsOpen && (
              <div className="absolute left-1/2 top-full mt-3 grid w-[620px] -translate-x-1/2 grid-cols-2 gap-0.5 rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-2 shadow-2xl shadow-black backdrop-blur-xl">
                {tools.map(({ href, label, description, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setToolsOpen(false)}
                    className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                      <Icon className="h-4 w-4 text-neutral-200" />
                    </span>
                    <span>
                      <span className="block text-sm text-white">{label}</span>
                      <span className="block text-xs text-neutral-500">{description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Account */}
        <div className="hidden min-w-[160px] items-center justify-end gap-2 md:flex">
          {loading ? null : user ? (
            <>
              <Link href="/dashboard" className="rounded-full px-4 py-2 text-sm text-neutral-300 transition-colors hover:text-white">
                Dashboard
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-4 py-2 text-sm text-neutral-300 transition-colors hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="group flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-all hover:bg-neutral-200"
              >
                Sign up
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-neutral-300 hover:bg-white/5 md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="border-t border-white/10 px-5 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col">
            {[...tools, ...navLinks].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="border-b border-white/5 py-3 text-neutral-300 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          {user ? (
            <Link href="/dashboard" className="mt-5 flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-medium text-black">
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/login" className="flex items-center justify-center rounded-full border border-white/15 py-2.5 text-sm text-white">
                Log in
              </Link>
              <Link href="/signup" className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-medium text-black">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
