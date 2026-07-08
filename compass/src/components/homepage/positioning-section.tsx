"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homepageV2 } from "@/config/homepage";
import { cn } from "@/lib/utils";

export function PositioningSection() {
  const { positioning } = homepageV2;

  return (
    <SectionReveal className="border-y border-border/40 bg-surface/40">
      <SectionHeader headline={positioning.headline} subheadline={positioning.subheadline} />

      <div className="relative mt-16">
        <div className="hidden lg:block absolute left-[16.66%] right-[16.66%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-border via-primary/30 to-border" />

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {positioning.spectrum.map((item, index) => (
            <motion.div
              key={item.id}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12, duration: 0.5 }}
              className={cn(
                "relative rounded-2xl border p-6 sm:p-8 transition-all",
                item.highlighted
                  ? "border-primary/30 bg-primary/[0.06] shadow-[0_0_60px_-20px_var(--glow)] lg:scale-105 lg:z-10"
                  : "border-border/50 bg-card/30 glass-panel",
              )}
            >
              {item.highlighted ? (
                <span className="mb-4 inline-flex rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  The COMPASS Way
                </span>
              ) : null}
              <h3 className={cn("text-lg font-semibold", item.highlighted && "text-primary")}>{item.title}</h3>
              <ul className="mt-5 space-y-2.5">
                {item.traits.map((trait) => (
                  <li key={trait} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", item.highlighted ? "text-primary" : "text-muted-foreground/60")} />
                    {trait}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionReveal>
  );
}
