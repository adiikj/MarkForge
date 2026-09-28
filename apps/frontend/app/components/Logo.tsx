import { FC } from "react";

// MarkForge mark: an "M" whose centre V doubles as the Markdown down-arrow (M↓ fused into one glyph).
export const LogoMark: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="currentColor" />
    <path
      d="M8 23.5V10.5l8 8.5 8-8.5v13M16 6.5v12.5"
      fill="none"
      stroke="#050505"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
