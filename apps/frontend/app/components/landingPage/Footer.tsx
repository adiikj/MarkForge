import Link from "next/link";
import { Github, Twitter } from "lucide-react";
import Logo from "../Logo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "README Studio", href: "/generate" },
      { label: "Health Score", href: "/health" },
      { label: "Section Blocks", href: "/blocks" },
      { label: "Badge Builder", href: "/badges" },
      { label: "Repo Docs Pack", href: "/docs-pack" },
      { label: "Changelog", href: "/changelog" },
      { label: "Table Editor", href: "/table" },
      { label: "Mermaid Diagrams", href: "/diagrams" },
      { label: "Converters", href: "/convert" },
      { label: "Toolkit", href: "/#toolkit" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "GitHub Markdown Guide", href: "https://docs.github.com/en/get-started/writing-on-github" },
    ],
  },
];

const Footer = () => {
  return (
    <footer id="contact" className="border-t border-white/[0.06] bg-[#050505] text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Link href="/" aria-label="MarkForge home">
              <Logo markClassName="h-7 w-7" />
            </Link>
            <p className="mt-4 text-sm text-neutral-500">
              The Markdown toolkit for developers. Forge docs that ship.
            </p>
            <div className="mt-5 flex gap-2">
              <a href="#" aria-label="GitHub" className="rounded-lg border border-white/10 p-2 text-neutral-400 transition-colors hover:border-white/25 hover:text-white">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Twitter" className="rounded-lg border border-white/10 p-2 text-neutral-400 transition-colors hover:border-white/25 hover:text-white">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-20">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-medium">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-neutral-500 transition-colors hover:text-white">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} MarkForge. All rights reserved.</p>
          <p>
            Designed and developed by{" "}
            <a
              href="https://adiikj.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-400 transition-colors hover:text-white"
            >
              Aditya
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
