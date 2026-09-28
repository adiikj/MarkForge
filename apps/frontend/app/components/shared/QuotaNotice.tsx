import { FC } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

/** Shown when the free daily repo-draft quota is used up. */
const QuotaNotice: FC = () => (
  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-gradient-to-r from-white/[0.08] to-transparent px-4 py-3">
    <Zap className="h-4 w-4 shrink-0" />
    <div className="min-w-0 flex-1 text-sm">
      <p className="font-medium">You&apos;ve used today&apos;s free repo drafts.</p>
      <p className="text-xs text-neutral-400">Resets at midnight UTC. Templates and editing stay unlimited.</p>
    </div>
    <Link href="/pricing" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200">
      See Pro
    </Link>
  </div>
);

export const QuotaChip: FC<{ remaining: number; limit: number }> = ({ remaining, limit }) => (
  <Link
    href="/pricing"
    className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[11px] font-normal text-neutral-400 transition-colors hover:border-white/25 hover:text-white"
  >
    {remaining} of {limit} free today
  </Link>
);

export default QuotaNotice;
