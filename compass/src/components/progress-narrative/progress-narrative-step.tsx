"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { ProgressNarrativeStepStatus } from "./progress-narrative.types";

interface ProgressNarrativeStepRowProps {
  label: string;
  status: ProgressNarrativeStepStatus;
}

export function ProgressNarrativeStepRow({ label, status }: ProgressNarrativeStepRowProps) {
  const isCompleted = status === "completed";
  const isActive = status === "active";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: smoothEase }}
      className={cn(
        "flex items-start gap-3 text-sm leading-relaxed",
        isCompleted && "text-muted-foreground",
        isActive && "text-foreground",
        !isCompleted && !isActive && "text-muted-foreground/45",
      )}
    >
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        {isCompleted ? (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: smoothEase }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary"
          >
            <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
          </motion.span>
        ) : (
          <motion.span
            animate={
              isActive
                ? {
                    scale: [1, 1.12, 1],
                    opacity: [0.85, 1, 0.85],
                  }
                : { scale: 1, opacity: 0.5 }
            }
            transition={
              isActive
                ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 }
            }
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isActive ? "bg-primary shadow-[0_0_12px_var(--glow)]" : "bg-white/20",
            )}
            aria-hidden
          />
        )}
      </span>
      <span className={cn(isActive && "font-medium")}>{label}</span>
    </motion.li>
  );
}
