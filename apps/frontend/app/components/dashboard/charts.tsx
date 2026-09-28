"use client";

import { FC, useState } from "react";

const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Single-series daily bar chart (magnitude → one sequential hue; the card title names the series,
 * so no legend). Thin bars with 4px rounded tops, 2px gaps, a recessive baseline, a hover tooltip
 * per bar, and a screen-reader table.
 */
export const ActivityBars: FC<{ data: { day: string; count: number }[]; height?: number }> = ({ data, height = 120 }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure className="relative">
      <div className="flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => {
          const h = d.count ? Math.max(4, (d.count / max) * (height - 8)) : 2;
          return (
            // Hit target is the full column, larger than the mark itself.
            <div key={d.day} className="flex h-full flex-1 cursor-default items-end" onMouseEnter={() => setHover(i)} aria-hidden="true">
              <div
                className={`w-full rounded-t-[4px] transition-colors ${d.count ? (hover === i ? "bg-white" : "bg-neutral-300") : "bg-white/10"}`}
                style={{ height: h }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-px bg-white/10" />
      <div className="mt-1.5 flex justify-between text-[10px] text-neutral-600" aria-hidden="true">
        <span>{dayLabel(data[0].day)}</span>
        <span>Today</span>
      </div>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-white/15 bg-[#111] px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
        >
          <span className="text-neutral-400">{dayLabel(data[hover].day)}</span>{" "}
          <span className="font-medium text-white">
            {data[hover].count} action{data[hover].count === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <figcaption className="sr-only">
        {total} actions in the last {data.length} days.
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{dayLabel(d.day)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
};

/** Health-score history for one repo: 2px line on a fixed 0–100 scale, hover shows each check. */
export const ScoreSparkline: FC<{ points: { score: number; createdAt: string }[]; width?: number; height?: number }> = ({
  points,
  width = 120,
  height = 32,
}) => {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <span className="text-xs text-neutral-600">{points.length ? "1 check so far" : "No checks yet"}</span>;
  const pad = 4;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (s: number) => pad + (1 - s / 100) * (height - pad * 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const last = points.length - 1;
  const h = hover ?? last;
  return (
    <div className="relative inline-flex items-center gap-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Score history: ${points.map((p) => p.score).join(", ")}`} onMouseLeave={() => setHover(null)}>
        <line x1={pad} x2={width - pad} y1={y(50)} y2={y(50)} stroke="rgb(255 255 255 / 0.08)" strokeDasharray="2 3" />
        <path d={path} fill="none" stroke="#d4d4d4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(h)} cy={y(points[h].score)} r="3.5" fill="#fff" stroke="#0a0a0a" strokeWidth="2" />
        {points.map((p, i) => (
          <rect
            key={p.createdAt}
            x={x(i) - (width / points.length) / 2}
            y={0}
            width={width / points.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <span className="pointer-events-none absolute -top-8 left-0 whitespace-nowrap rounded-md border border-white/15 bg-[#111] px-2 py-1 text-[11px] shadow-xl">
          <span className="font-medium text-white">{points[hover].score}</span>{" "}
          <span className="text-neutral-400">{new Date(points[hover].createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
        </span>
      )}
    </div>
  );
};

/** Quota / limit meter: a stat, not a chart. */
export const Meter: FC<{ value: number; max: number | null; label: string }> = ({ value, max, label }) => {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className="font-mono tabular-nums text-neutral-200">{max === null ? `${value} · unlimited` : `${value} / ${max}`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max ?? undefined} aria-label={label}>
        <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${max === null ? 0 : pct}%` }} />
      </div>
    </div>
  );
};
