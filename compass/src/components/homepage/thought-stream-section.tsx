"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { staggerContainer, staggerItem, smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function ThoughtStreamSection() {
  const { thoughtStream } = homeLoanLanding;
  const [activeId, setActiveId] = useState<string | null>(thoughtStream.thoughts[0]?.id ?? null);

  return (
    <SectionReveal id="thought-stream" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_20%,rgba(45,212,191,0.06),transparent)]" />

      <SectionHeader
        eyebrow={thoughtStream.eyebrow}
        headline={thoughtStream.headline}
        subheadline={thoughtStream.subheadline}
      />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true, margin: "-40px" }}
        variants={staggerContainer}
        className="relative mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3"
      >
        {thoughtStream.thoughts.map((thought, index) => {
          const isActive = activeId === thought.id;

          return (
            <motion.button
              key={thought.id}
              type="button"
              variants={staggerItem}
              onClick={() => setActiveId(isActive ? null : thought.id)}
              onMouseEnter={() => setActiveId(thought.id)}
              aria-pressed={isActive}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-500 sm:p-6",
                isActive
                  ? "border-primary/35 bg-primary/[0.07] shadow-[0_0_40px_-16px_var(--glow)]"
                  : "border-border/60 bg-surface/40 hover:border-primary/20 hover:bg-surface/70",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="mt-3 text-base font-semibold leading-snug text-foreground sm:text-lg">
                {thought.question}
              </p>

              <AnimatePresence initial={false}>
                {isActive ? (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.35, ease: smoothEase }}
                    className="overflow-hidden text-sm text-primary/90"
                  >
                    {"answer" in thought ? thought.answer : null}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <span
                className={cn(
                  "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity duration-500",
                  isActive ? "bg-primary/20 opacity-100" : "bg-primary/10 opacity-0 group-hover:opacity-60",
                )}
              />
            </motion.button>
          );
        })}
      </motion.div>
    </SectionReveal>
  );
}
