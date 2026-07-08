"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/homepage/shared/animated-counter";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { staggerContainer, staggerItem } from "@/lib/animations";

export function HomeLoanMetricsSection() {
  const { metrics } = homeLoanLanding;

  return (
    <SectionReveal id="performance-metrics" className="relative">
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
        className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.items.map((item) => (
          <motion.div
            key={item.id}
            variants={staggerItem}
            className="rounded-2xl glass-panel px-4 py-8 sm:py-10"
          >
            <AnimatedCounter
              value={"value" in item ? item.value : 0}
              prefix={"prefix" in item ? item.prefix : undefined}
              suffix={"suffix" in item ? item.suffix : undefined}
              displayValue={"displayValue" in item ? item.displayValue : undefined}
              label={item.label}
              className="[&>p:first-child]:text-4xl [&>p:first-child]:sm:text-5xl [&>p:first-child]:lg:text-6xl [&>p:first-child]:text-gradient"
            />
          </motion.div>
        ))}
      </motion.div>
    </SectionReveal>
  );
}
