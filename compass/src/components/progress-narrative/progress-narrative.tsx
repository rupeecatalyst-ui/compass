"use client";

import { AnimatePresence, motion } from "framer-motion";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { ProgressNarrativeStepRow } from "./progress-narrative-step";
import type { ProgressNarrativeProps } from "./progress-narrative.types";

/**
 * Conversational progress narrative — primary SARATHI reassurance layer.
 * No progress bars, percentages, or spinners.
 */
export function ProgressNarrative({
  headline,
  activeMessage,
  steps,
  isComplete = false,
  className,
}: ProgressNarrativeProps) {
  return (
    <div
      className={cn("w-full max-w-md", className)}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete}
    >
      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
        {headline}
      </p>

      <AnimatePresence mode="wait">
        <motion.p
          key={activeMessage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.45, ease: smoothEase }}
          className="mt-4 text-center text-lg font-medium leading-snug text-foreground sm:text-xl"
        >
          {activeMessage}
        </motion.p>
      </AnimatePresence>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-5 sm:px-6">
        <ul className="space-y-3.5" aria-label="Advisory progress">
          {steps.map((step) => (
            <ProgressNarrativeStepRow key={step.id} label={step.label} status={step.status} />
          ))}
        </ul>
      </div>
    </div>
  );
}
