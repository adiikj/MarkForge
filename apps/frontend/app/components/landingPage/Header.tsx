"use client";

import { useEffect, useState, FC } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "../Logo";

const navLinks = [
  { href: "/#toolkit", label: "Toolkit" },
  { href: "/generate", label: "Studio" },
  { href: "/health", label: "Health Score" },
  { href: "/pricing", label: "Pricing" },
];

const Header: FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

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

        {/* Get Started Button */}
        <Link
          href="/generate"
          className="group hidden items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-all hover:bg-neutral-200 md:flex"
        >
          Get Started
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

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
            {navLinks.map((link) => (
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
          <Link
            href="/generate"
            className="mt-5 flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-sm font-medium text-black"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
