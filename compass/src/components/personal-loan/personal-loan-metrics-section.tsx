"use client";

import { motion } from "framer-motion";
import { Headphones, Sparkles, Target, Zap } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { personalLoanLanding } from "@/config/personal-loan-landing";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const metricIcons = {
  bolt: Zap,
  target: Target,
  headset: Headphones,
  sparkles: Sparkles,
} as const;

export function PersonalLoanMetricsSection() {
  const { metrics } = personalLoanLanding;

  return (
    <SectionReveal id="performance-metrics" spacing="related" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(34,211,238,0.06),transparent)]" />

      <SectionHeader eyebrow={metrics.eyebrow} headline={metrics.headline} subheadline={metrics.subheadline} />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="relative mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.items.map((item) => {
          const Icon = metricIcons[item.icon as keyof typeof metricIcons] ?? Sparkles;
          return (
            <motion.div
              key={item.id}
              variants={staggerItem}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-primary/15 bg-white/5 px-4 py-7 shadow-[0_0_44px_-22px_var(--glow)] backdrop-blur sm:px-5 sm:py-9",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(59,130,246,0.10),transparent_70%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-3xl font-bold tracking-tight text-gradient sm:text-4xl lg:text-5xl tabular-nums">
                  {item.displayValue}
                </p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm tracking-wide">{item.label}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </SectionReveal>
  );
}

