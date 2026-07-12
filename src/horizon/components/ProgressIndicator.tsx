"use client";

import { cn } from "@/lib/utils";

export function ProgressIndicator({
  value,
  className,
  size = "md",
  showLabel = true,
}: {
  value: number;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-zinc-800",
          size === "sm" ? "h-1 w-16" : "h-1.5 w-24",
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-600/80 to-cyan-400/80"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel ? (
        <span className="tabular-nums text-[10px] text-zinc-500">{clamped}%</span>
      ) : null}
    </div>
  );
}
