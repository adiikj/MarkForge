import { FC } from "react";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ScoreRing: FC<{ score: number; size?: number }> = ({ score, size = 136 }) => (
  <div className="relative shrink-0" style={{ width: size, height: size }}>
    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
      <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
      <circle
        cx="60"
        cy="60"
        r={RADIUS}
        fill="none"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - score / 100)}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Text scales with the ring; the "/ 100" caption only fits on larger rings. */}
      <span className="font-semibold leading-none tabular-nums" style={{ fontSize: Math.round(size * 0.27) }}>
        {score}
      </span>
      {size >= 96 && <span className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">/ 100</span>}
    </div>
  </div>
);

export default ScoreRing;
