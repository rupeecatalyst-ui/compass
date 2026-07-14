"use client";

import type { UgjProgress } from "@/types/universal-guided-journey";
import { cn } from "@/lib/utils";

export function UgjProgressBar({
  progress,
  stepCount,
}: {
  progress: UgjProgress;
  stepCount: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Step {progress.stepIndex + 1} of {progress.stepCount}
        </span>
        <span className="font-medium text-foreground">{progress.percent}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/80">
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out dark:bg-teal-400"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: stepCount }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              idx <= progress.stepIndex
                ? "bg-teal-600/80 dark:bg-teal-400/80"
                : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
