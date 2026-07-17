"use client";

import { formatINRCompact } from "@/lib/format-currency";
import type { EiWaterfallStep } from "@/types/executive-intelligence-platform";
import { cn } from "@/lib/utils";

/** Revenue Contribution → Waterfall */
export function EiWaterfallChart({ steps }: { steps: EiWaterfallStep[] }) {
  let running = 0;
  const maxAbs = Math.max(...steps.map((s) => Math.abs(s.amount)), 1);

  const rendered = steps.map((step) => {
    const start = running;
    if (step.kind === "total") {
      running = step.amount;
    } else {
      running += step.amount;
    }
    const end = running;
    const low = Math.min(start, end, step.kind === "total" ? 0 : start);
    const high = Math.max(start, end, step.kind === "total" ? step.amount : end);
    return { step, low, high, start, end };
  });

  return (
    <div className="space-y-2">
      {rendered.map(({ step, low, high }) => {
        const left = (low / maxAbs) * 100;
        const width = Math.max(2, ((high - low) / maxAbs) * 100);
        return (
          <div key={step.id} className="flex items-center gap-3">
            <p className="w-32 shrink-0 truncate text-[10px] font-medium">{step.label}</p>
            <div className="relative h-7 flex-1 rounded bg-muted/40">
              <div
                className={cn(
                  "absolute top-1 h-5 rounded-sm",
                  step.kind === "increase" && "bg-teal-600",
                  step.kind === "decrease" && "bg-rose-500",
                  step.kind === "total" && "bg-slate-800 dark:bg-slate-200",
                )}
                style={{ left: `${Math.max(0, left)}%`, width: `${width}%` }}
              />
            </div>
            <p
              className={cn(
                "w-20 shrink-0 text-right text-[10px] font-semibold tabular-nums",
                step.kind === "decrease" && "text-rose-600",
              )}
            >
              {step.kind === "decrease" ? "−" : ""}
              {formatINRCompact(Math.abs(step.amount))}
            </p>
          </div>
        );
      })}
    </div>
  );
}
