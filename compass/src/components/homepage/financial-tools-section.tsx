"use client";

import { motion } from "framer-motion";
import {
  BadgePercent,
  Calculator,
  Home,
  LineChart,
  Activity,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { staggerContainer, staggerItem } from "@/lib/animations";

const toolIcons: Record<string, LucideIcon> = {
  advantage: Sparkles,
  emi: Calculator,
  eligibility: LineChart,
  bt: RefreshCw,
  affordability: Home,
  stamp: BadgePercent,
  fitness: Activity,
};

export function FinancialToolsSection() {
  const { tools } = homeLoanLanding;

  return (
    <SectionReveal id="tools" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_80%_10%,rgba(74,222,128,0.05),transparent)]" />

      <SectionHeader eyebrow={tools.eyebrow} headline={tools.headline} subheadline={tools.subheadline} />

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="relative mt-10 grid gap-3 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3"
      >
        {tools.items.map((tool) => {
          const Icon = toolIcons[tool.id] ?? Calculator;

          return (
            <motion.article
              key={tool.id}
              variants={staggerItem}
              className="group relative overflow-hidden rounded-2xl glass-panel glass-panel-hover p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="rounded-full border border-border/70 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {tools.status}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{tool.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
            </motion.article>
          );
        })}
      </motion.div>
    </SectionReveal>
  );
}
