"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgePercent,
  Calculator,
  Home,
  LineChart,
  Activity,
  RefreshCw,
  Sparkles,
  Scale,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { IntelligenceBadge } from "@/components/coaching/intelligence-badge";
import { SectionHeader, SectionReveal } from "@/components/homepage/shared/section-reveal";
import { tools } from "@/config/coaching";
import { ROUTES, toolRoute } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/lib/animations";

const toolIcons: Record<string, LucideIcon> = {
  "compass-advantage": Sparkles,
  "emi-calculator": Calculator,
  "eligibility-calculator": LineChart,
  "balance-transfer-calculator": RefreshCw,
  "affordability-calculator": Home,
  "stamp-duty-calculator": BadgePercent,
  "registration-calculator": FileText,
  "financial-fitness-calculator": Activity,
  "loan-comparison": Scale,
};

export function FinancialToolsSection() {
  return (
    <SectionReveal id="tools" className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_80%_10%,rgba(74,222,128,0.05),transparent)]" />

      <SectionHeader
        eyebrow="Financial Intelligence"
        headline="Tools for clearer home loan decisions"
        subheadline="Premium guidance instruments — Coming Soon. Each tool will be powered by Catalyst One Intelligence."
      />

      <div className="mt-6 flex justify-center">
        <IntelligenceBadge />
      </div>

      <motion.div
        initial={false}
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="relative mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3"
      >
        {tools.map((tool) => {
          const Icon = toolIcons[tool.slug] ?? Calculator;

          return (
            <motion.article key={tool.slug} variants={staggerItem}>
              <Link
                href={toolRoute(tool.slug)}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl glass-panel glass-panel-hover p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full border border-border/70 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Coming Soon
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{tool.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
              </Link>
            </motion.article>
          );
        })}
      </motion.div>

      <div className="mt-8 text-center">
        <Link href={ROUTES.TOOLS} className="text-sm font-medium text-primary hover:text-primary/80">
          View all Financial Intelligence tools →
        </Link>
      </div>
    </SectionReveal>
  );
}
