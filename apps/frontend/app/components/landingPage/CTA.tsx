import { FC } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CTA: FC = () => {
  return (
    <section className="px-5 pb-24 text-white md:px-8 md:pb-32">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] px-6 py-20 text-center md:py-24">
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_100%,black_30%,transparent_100%)]" />
        <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full bg-white/10 blur-[100px]" />

        <div className="relative">
          <p className="font-mono text-sm text-neutral-500">
            <span className="text-neutral-300">#</span> ready?
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
            Your repo deserves a better first impression.
          </h2>
          <Link
            href="/generate"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-medium text-black shadow-[0_0_50px_-10px_rgba(255,255,255,0.6)] transition-all hover:bg-neutral-200"
          >
            Forge your README
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTA;
