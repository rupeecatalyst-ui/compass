"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { productPillarIcons, type ProductLandingConfig } from "@/config/product-experience-types";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface ProductWhySectionProps {
  landing: ProductLandingConfig;
}

export function ProductWhySection({ landing }: ProductWhySectionProps) {
  const { why } = landing;

  return (
    <SectionReveal id="why-compass" spacing="related" className="relative">
      <SectionHeader eyebrow={why.eyebrow} headline={why.headline} subheadline={why.subheadline} />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="mt-10 grid gap-4 sm:mt-12 md:grid-cols-3 md:gap-5"
      >
        {why.pillars.map((pillar) => {
          const Icon = productPillarIcons[pillar.id] ?? Sparkles;
          return (
            <motion.div key={pillar.id} variants={staggerItem} className="rounded-2xl glass-panel p-6 sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
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
