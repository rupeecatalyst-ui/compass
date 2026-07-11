"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { HlBody, HlChapter, HlEyebrow, HlHeadline } from "@/components/home-loan-experience/hl-chapter";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function HlJourneyTimeline() {
  const { journey } = homeLoanExperience;
  const [hovered, setHovered] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <HlChapter id="guided-journey" className="border-t border-white/[0.04] bg-[#06080d]">
      <div className="mb-14 text-center">
        <HlEyebrow className="text-center">{journey.eyebrow}</HlEyebrow>
        <HlHeadline className="mx-auto max-w-2xl">{journey.headline}</HlHeadline>
        <HlBody className="mx-auto mt-4 max-w-lg">{journey.subheadline}</HlBody>
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Timeline rail */}
        <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent sm:left-1/2 sm:block sm:-translate-x-px" />

        <div className="space-y-6 sm:space-y-0">
          {journey.stages.map((stage, index) => {
            const isHovered = hovered === stage.id;
            const isActive = stage.status === "active";
            const isComplete = stage.status === "complete";

            return (
              <motion.div
                key={stage.id}
                initial={reduceMotion ? false : { opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: index * 0.08, ease: smoothEase }}
                className={cn(
                  "relative sm:grid sm:grid-cols-2 sm:gap-8",
                  index % 2 === 1 && "sm:[&>div:first-child]:order-2",
                )}
                onMouseEnter={() => setHovered(stage.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="hidden sm:block" />
                <div
                  className={cn(
                    "relative rounded-2xl border p-5 transition-all duration-500 sm:p-6",
                    isHovered || isActive
                      ? "border-primary/35 bg-primary/[0.07] shadow-[0_0_40px_-16px_var(--glow)]"
                      : "border-white/[0.06] bg-white/[0.02]",
                    isComplete && !isHovered && "opacity-80",
                  )}
                >
                  <div className="absolute -left-[1.65rem] top-6 hidden h-3 w-3 rounded-full border-2 border-primary bg-background sm:left-1/2 sm:-translate-x-1/2 sm:block" />

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border",
                        isComplete && "border-primary/40 bg-primary/20 text-primary",
                        isActive && "border-primary bg-primary/15 text-primary shadow-[0_0_20px_-6px_var(--glow)]",
                        !isComplete && !isActive && "border-white/10 text-muted-foreground",
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {stage.label}
                      </p>
                      <p className="text-lg font-semibold tracking-tight">{stage.title}</p>
                    </div>
                  </div>

                  <motion.p
                    initial={false}
                    animate={{ opacity: isHovered || isActive ? 1 : 0.7, height: "auto" }}
                    className="mt-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    {stage.description}
                  </motion.p>

                  {isActive ? (
                    <p className="mt-3 text-xs font-medium text-primary">You are here</p>
                  ) : isComplete ? (
                    <p className="mt-3 text-xs text-muted-foreground">Completed</p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">Coming next</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </HlChapter>
  );
}
