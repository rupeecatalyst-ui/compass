"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homeLoanLanding } from "@/config/home-loan-landing";
import { homepageV2 } from "@/config/homepage";
import { staggerContainer, staggerItem } from "@/lib/animations";

const trustIcons = {
  building: Building2,
  trending: TrendingUp,
  shield: Shield,
} as const;

export function HeroSection() {
  const { hero } = homeLoanLanding;
  const trustIndicators = homepageV2.hero.trustIndicators;

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-12 lg:pt-16 pb-16 sm:pb-20">
      <div className="pointer-events-none absolute inset-0 ambient-glow" />
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-40" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial={false}
          animate="animate"
          className="mx-auto max-w-3xl space-y-7 text-center sm:space-y-8"
        >
          <motion.p
            variants={staggerItem}
            className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
          >
            {hero.eyebrow}
          </motion.p>

          <motion.div variants={staggerItem} className="space-y-3">
            <h1 className="text-[2rem] font-bold tracking-tight leading-[1.15] sm:text-5xl lg:text-6xl xl:text-[3.75rem] xl:leading-[1.08]">
              <span className="block text-gradient-subtle">{hero.headline}</span>
              <span className="mt-2 block text-gradient sm:mt-3">{hero.headlineAccent}</span>
            </h1>
          </motion.div>

          <motion.p
            variants={staggerItem}
            className="mx-auto max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg"
          >
            {hero.subheadline}
          </motion.p>

          <motion.ul
            variants={staggerItem}
            className="mx-auto flex max-w-xl flex-col gap-2.5 text-left sm:items-center sm:text-center"
          >
            {hero.valueProps.map((prop) => (
              <li
                key={prop}
                className="flex items-start gap-2.5 text-sm text-foreground/90 sm:justify-center"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {prop}
              </li>
            ))}
          </motion.ul>

          <motion.div
            variants={staggerItem}
            className="flex flex-wrap items-center justify-center gap-2.5"
          >
            {trustIndicators.map((item) => {
              const Icon = trustIcons[item.icon];
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-surface/50 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {item.label}
                </div>
              );
            })}
          </motion.div>

            <motion.div
              variants={staggerItem}
              className="flex flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <Button size="lg" className="h-12 px-6 sm:px-8" asChild>
                <Link href="#journey-cta">
                  <span className="sm:hidden">{hero.primaryCtaShort}</span>
                  <span className="hidden sm:inline">{hero.primaryCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-border/80 bg-transparent hover:bg-white/5"
                asChild
              >
                <Link href="#sarathi">{hero.secondaryCta}</Link>
              </Button>
            </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
