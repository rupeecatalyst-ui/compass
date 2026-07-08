"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { personalLoanLanding } from "@/config/personal-loan-landing";
import { staggerContainer, staggerItem, smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function PersonalLoanQuestionsSection() {
  const { questions } = personalLoanLanding;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <SectionReveal id="home-buyer-questions" spacing="related" className="relative">
      <SectionHeader eyebrow={questions.eyebrow} headline={questions.headline} subheadline={questions.subheadline} />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="relative mx-auto mt-10 max-w-3xl space-y-3 sm:mt-12"
      >
        {questions.items.map((item, index) => {
          const isOpen = openId === item.id;
          return (
            <motion.button
              key={item.id}
              type="button"
              variants={staggerItem}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className={cn(
                "group w-full cursor-pointer overflow-hidden rounded-2xl border p-5 text-left transition-all duration-400 sm:p-6",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isOpen
                  ? "border-primary/35 bg-primary/[0.07] shadow-[0_0_40px_-16px_var(--glow)]"
                  : "border-border/60 bg-surface/40 hover:border-primary/20 hover:bg-surface/70",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-2 text-base font-semibold leading-snug sm:text-lg">{item.question}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180 text-primary",
                  )}
                  aria-hidden
                />
              </div>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 14 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.35, ease: smoothEase }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>
    </SectionReveal>
  );
}

