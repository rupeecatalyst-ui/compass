"use client";

import { motion } from "framer-motion";
import { Building2, Handshake, Home, ShieldCheck } from "lucide-react";
import { AnimatedCounter } from "@/components/homepage/shared/animated-counter";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { staggerContainer, staggerItem } from "@/lib/animations";

const metricIcons = {
  network: Handshake,
  banknote: Building2,
  shield: ShieldCheck,
  home: Home,
} as const;

export function HomeLoanMetricsSection() {
  const { metrics } = homeLoanLanding;

  return (
    <SectionReveal id="performance-metrics" spacing="related" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(45,212,191,0.07),transparent)]" />

      <SectionHeader
        eyebrow={metrics.eyebrow}
        headline={metrics.headline}
        subheadline={metrics.subheadline}
      />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="relative mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.items.map((item) => (
          <motion.div
            key={item.id}
            variants={staggerItem}
            className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-white/5 px-4 py-7 shadow-[0_0_40px_-18px_var(--glow)] backdrop-blur sm:px-5 sm:py-9"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(45,212,191,0.10),transparent_70%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                {(() => {
                  const Icon = metricIcons[item.icon as keyof typeof metricIcons] ?? ShieldCheck;
                  return <Icon className="h-5 w-5" aria-hidden />;
                })()}
              </div>
            <AnimatedCounter
              value={item.value}
              prefix={"prefix" in item ? item.prefix : undefined}
              suffix={item.suffix}
              label={item.label}
              className="[&>p:first-child]:tabular-nums [&>p:first-child]:text-3xl [&>p:first-child]:sm:text-4xl [&>p:first-child]:lg:text-5xl [&>p:first-child]:text-gradient [&>p:last-child]:text-xs [&>p:last-child]:sm:text-sm [&>p:last-child]:tracking-wide"
            />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </SectionReveal>
  );
}
