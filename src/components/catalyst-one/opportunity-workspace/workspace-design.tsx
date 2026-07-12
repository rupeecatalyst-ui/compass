"use client";

import { cn } from "@/lib/utils";

/** Shared Opportunity Workspace design language (SPR-003.1). */

export function OwGlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-900/70 p-4 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function OwSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-300/90">
      {children}
    </p>
  );
}

export function OwInfoChip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-[7.5rem] rounded-xl border border-white/10 bg-zinc-950/55 px-3 py-2",
        className,
      )}
    >
      <p className="text-[9px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

export function OwKpiCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "critical" | "info";
}) {
  const toneRing = {
    neutral: "border-white/10",
    good: "border-emerald-500/35",
    warn: "border-amber-500/40",
    critical: "border-rose-500/40",
    info: "border-teal-500/35",
  }[tone];

  return (
    <div className={cn("min-w-[7rem] flex-1 rounded-xl border bg-zinc-950/50 px-3 py-2.5", toneRing)}>
      <p className="text-[9px] uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-50">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export function OwCircularProgress({
  value,
  size = 72,
  stroke = 7,
  label,
  colour = "stroke-teal-400",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  colour?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-zinc-800"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn("transition-[stroke-dashoffset] duration-700 ease-out", colour)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold tabular-nums text-zinc-100">{Math.round(clamped)}%</span>
        {label && <span className="text-[8px] uppercase tracking-wide text-zinc-500">{label}</span>}
      </div>
    </div>
  );
}

export function OwPanelHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <OwSectionLabel>{title}</OwSectionLabel>
        {description && <p className="mt-1 text-xs text-zinc-400">{description}</p>}
      </div>
      {badge && (
        <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-200">
          {badge}
        </span>
      )}
    </div>
  );
}
