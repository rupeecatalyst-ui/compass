"use client";

import Image from "next/image";
import type { UgjStepDefinition } from "@/types/universal-guided-journey";
import { cn } from "@/lib/utils";

export interface UgjGuidanceCardProps {
  greeting: string;
  step: UgjStepDefinition;
  className?: string;
}

/**
 * CF-CHANAKYA-008 — CHANAKYA Guidance Card for Universal Guided Journey steps.
 */
export function UgjGuidanceCard({ greeting, step, className }: UgjGuidanceCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-50/90 via-white to-teal-50/40 p-4 shadow-sm dark:border-violet-800/40 dark:from-violet-950/40 dark:via-zinc-950 dark:to-teal-950/20",
        className,
      )}
    >
      <div className="flex gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-violet-400/35">
          <Image
            src="/images/chanakya-portrait.png"
            alt="CHANAKYA"
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
            CHANAKYA · Guided Journey
          </p>
          <p className="text-sm font-semibold tracking-tight text-foreground">{greeting}</p>
          {step.guidanceHint && (
            <p className="text-xs leading-relaxed text-foreground/85">{step.guidanceHint}</p>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground/80">
              Why ·{" "}
            </span>
            {step.whyRequired}
          </p>
        </div>
      </div>
    </div>
  );
}
