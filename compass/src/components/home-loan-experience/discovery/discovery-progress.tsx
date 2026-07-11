"use client";

import { Check } from "lucide-react";
import { DISCOVERY_STAGES, stepToStageIndex, type DiscoveryStepId } from "@/config/home-loan-discovery";
import { cn } from "@/lib/utils";

export function DiscoveryProgress({ step }: { step: DiscoveryStepId }) {
  const current = stepToStageIndex(step);

  return (
    <nav aria-label="Journey progress" className="w-full overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {DISCOVERY_STAGES.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex items-center gap-1 sm:gap-2">
              {index > 0 ? (
                <span
                  className={cn(
                    "hidden h-px w-4 sm:block sm:w-8",
                    done ? "bg-primary/50" : "bg-white/10",
                  )}
                  aria-hidden
                />
              ) : null}
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-all duration-500 sm:px-3",
                  active && "border-primary/40 bg-primary/[0.1] shadow-[0_0_24px_-8px_var(--glow)]",
                  done && !active && "border-primary/25 bg-primary/[0.05]",
                  !done && !active && "border-white/[0.06] bg-white/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                    done && "bg-primary/25 text-primary",
                    active && "bg-primary/30 text-primary ring-2 ring-primary/30",
                    !done && !active && "border border-white/10 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[10px] font-medium tracking-wide sm:text-[11px]",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
