"use client";

import { Check } from "lucide-react";
import { DISCOVERY_STAGES, stepToStageIndex } from "@/config/home-loan-discovery";
import { cn } from "@/lib/utils";

export function DiscoveryProgress({ step }: { step: string }) {
  const current = stepToStageIndex(step);

  return (
    <nav aria-label="Journey progress" className="min-w-0 flex-1 overflow-hidden">
      <ol className="flex items-center justify-center gap-1">
        {DISCOVERY_STAGES.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex min-w-0 items-center gap-1">
              <div
                className={cn(
                  "flex max-w-full items-center gap-1 rounded-full border px-1.5 py-1 sm:px-2",
                  active && "border-primary/40 bg-primary/[0.1]",
                  done && !active && "border-primary/25 bg-primary/[0.05]",
                  !done && !active && "border-white/[0.06] bg-white/[0.02]",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]",
                    (done || active) && "text-primary",
                    !done && !active && "text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-[10px] font-medium",
                    active ? "max-w-[7.5rem] text-foreground sm:max-w-[9rem]" : "hidden text-muted-foreground md:inline md:max-w-[6rem]",
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
