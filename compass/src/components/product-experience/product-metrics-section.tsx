"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { productMetricIcons, type ProductLandingConfig } from "@/config/product-experience-types";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface ProductMetricsSectionProps {
  landing: ProductLandingConfig;
}

export function ProductMetricsSection({ landing }: ProductMetricsSectionProps) {
  const { metrics } = landing;

  return (
    <SectionReveal id="performance-metrics" spacing="related" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(255,255,255,0.03),transparent)]" />

      <SectionHeader eyebrow={metrics.eyebrow} headline={metrics.headline} subheadline={metrics.subheadline} />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="relative mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.items.map((item) => {
          const Icon = productMetricIcons[item.icon] ?? Sparkles;
          const display =
            item.displayValue ??
            `${item.prefix ?? ""}${item.value?.toLocaleString("en-IN") ?? ""}${item.suffix ?? ""}`;

          return (
            <motion.div
              key={item.id}
              variants={staggerItem}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-primary/15 bg-white/5 px-4 py-7 shadow-[0_0_44px_-22px_var(--glow)] backdrop-blur sm:px-5 sm:py-9",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(255,255,255,0.05),transparent_70%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="text-3xl font-bold tracking-tight text-gradient sm:text-4xl lg:text-5xl tabular-nums">
                  {display}
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
