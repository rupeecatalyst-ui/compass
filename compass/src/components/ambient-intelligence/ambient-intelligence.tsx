"use client";

import { motion } from "framer-motion";
import { useAmbientCycle } from "@/components/ambient-intelligence/use-ambient-cycle";
import { AMBIENT_FADE_MS, type AmbientContext } from "@/config/ambient-intelligence";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

type AmbientIntelligenceProps = {
  context: AmbientContext;
  enabled?: boolean;
  className?: string;
  variant?: "page" | "overlay";
};

/**
 * Subtle floating insight — one message at a time, context-aware, never interrupting.
 * Master template component for all COMPASS product experiences.
 */
export function AmbientIntelligence({
  context,
  enabled = true,
  className,
  variant = "page",
}: AmbientIntelligenceProps) {
  const { message, visible } = useAmbientCycle(context, enabled);

  if (!enabled) return null;

  return (
    <div
      className={cn(
        "pointer-events-none select-none",
        variant === "overlay" ? "absolute inset-x-0 bottom-6 flex justify-center px-6" : "flex justify-center",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <motion.p
        key={`${context}-${message}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 4 }}
        transition={{ duration: AMBIENT_FADE_MS / 1000, ease: smoothEase }}
        className={cn(
          "max-w-[16rem] text-center text-[11px] leading-snug tracking-wide sm:max-w-xs sm:text-xs",
          variant === "overlay"
            ? "rounded-full border border-white/[0.06] bg-[#05070c]/60 px-4 py-2 text-muted-foreground/80 backdrop-blur-md"
            : "text-muted-foreground/60",
        )}
      >
        {message}
      </motion.p>
    </div>
  );
}
