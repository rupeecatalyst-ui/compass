"use client";

import { motion } from "framer-motion";
import { Eye, Scale, ShieldCheck } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { staggerContainer, staggerItem } from "@/lib/animations";

const pillarIcons = {
  confidence: ShieldCheck,
  transparency: Eye,
  decisions: Scale,
} as const;

export function WhyCompassSection() {
  const { whyCompass } = homeLoanLanding;

  return (
    <SectionReveal id="why-compass" className="relative">
      <SectionHeader
        eyebrow={whyCompass.eyebrow}
        headline={whyCompass.headline}
        subheadline={whyCompass.subheadline}
      />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-3 md:gap-5"
      >
        {whyCompass.pillars.map((pillar) => {
          const Icon = pillarIcons[pillar.id as keyof typeof pillarIcons] ?? ShieldCheck;

          return (
            <motion.div
              key={pillar.id}
              variants={staggerItem}
              className="rounded-2xl glass-panel p-6 sm:p-7"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.description}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </SectionReveal>
  );
}
