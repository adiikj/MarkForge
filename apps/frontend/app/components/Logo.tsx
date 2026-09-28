import { FC } from "react";

// MarkForge mark: a geometric M with a four-point spark (forge + AI drafting).
export const LogoMark: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="currentColor" />
    <path d="M8 23V9l7 8 7-8v14" fill="none" stroke="#050505" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M25 5l.95 2.45L28.4 8.4l-2.45.95L25 11.8l-.95-2.45L21.6 8.4l2.45-.95z" fill="#050505" />
  </svg>
);

const Logo: FC<{ className?: string; markClassName?: string }> = ({ className, markClassName = "h-8 w-8" }) => (
  <span className={`flex items-center gap-2.5 text-white ${className ?? ""}`}>
    <LogoMark className={markClassName} />
    <span className="text-lg font-semibold tracking-tight">
      Mark<span className="text-neutral-400">Forge</span>
    </span>
  </span>
);

export default Logo;
