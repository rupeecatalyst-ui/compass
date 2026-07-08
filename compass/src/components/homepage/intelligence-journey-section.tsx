"use client";

import { motion } from "framer-motion";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homepageV2 } from "@/config/homepage";

export function IntelligenceJourneySection() {
  const { intelligenceJourney } = homepageV2;

  return (
    <SectionReveal className="border-y border-border/40 bg-surface/50">
      <SectionHeader headline={intelligenceJourney.headline} subheadline={intelligenceJourney.subheadline} />

      <div className="relative mt-16 hidden lg:block">
        <div className="absolute left-[10%] right-[10%] top-8 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="grid grid-cols-5 gap-4">
          {intelligenceJourney.steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="group text-center"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10"
              >
                <span className="text-lg font-bold text-primary">{index + 1}</span>
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden
                />
              </motion.div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{step.label}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed px-1">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-12 space-y-4 lg:hidden">
        {intelligenceJourney.steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={false}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="flex gap-4 rounded-2xl border border-border/50 bg-card/50 p-4 glass-panel"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{step.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionReveal>
  );
}
