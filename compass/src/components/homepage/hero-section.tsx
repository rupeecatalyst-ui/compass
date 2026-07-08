"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homepageV2 } from "@/config/homepage";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const trustIcons = {
  building: Building2,
  trending: TrendingUp,
  shield: Shield,
} as const;

function JourneyCard({
  title,
  subtitle,
  description,
  cta,
  variant,
  href,
}: {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  variant: "borrow" | "invest";
  href: string;
}) {
  return (
    <motion.div
      initial={false}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl glass-panel glass-panel-hover"
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60",
          variant === "borrow" ? "bg-primary/20" : "bg-accent/20",
        )}
      />
      <div className="relative p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{subtitle}</p>
        <h3 className="mt-2 text-3xl font-bold tracking-tight">{title}</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{description}</p>
        <Link
          href={href}
          className={cn(
            "mt-6 inline-flex items-center gap-2 text-sm font-medium transition-colors",
            variant === "borrow" ? "text-primary hover:text-primary/80" : "text-accent hover:text-accent/80",
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  const { hero } = homepageV2;

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-12 lg:pt-16 pb-16 sm:pb-20">
      <div className="pointer-events-none absolute inset-0 ambient-glow" />
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-40" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <motion.div
            variants={staggerContainer}
            initial={false}
            animate="animate"
            className="space-y-8"
          >
            <motion.p
              variants={staggerItem}
              className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
            >
              {hero.eyebrow}
            </motion.p>

            <motion.div variants={staggerItem} className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-[4rem] xl:leading-[1.05]">
                <span className="block">{hero.headline}</span>
                {hero.headlineLine2 ? <span className="mt-3 block text-gradient-subtle">{hero.headlineLine2}</span> : null}
                {hero.headlineAccent ? <span className="mt-2 block text-gradient">{hero.headlineAccent}</span> : null}
              </h1>
            </motion.div>

            <motion.p variants={staggerItem} className="max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
              {hero.subheadline}
            </motion.p>

            <motion.ul variants={staggerItem} className="space-y-2.5">
              {hero.valueProps.map((prop) => (
                <li key={prop} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {prop}
                </li>
              ))}
            </motion.ul>

            <motion.div variants={staggerItem} className="flex flex-wrap gap-4">
              {hero.trustIndicators.map((item) => {
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

            <motion.div variants={staggerItem} className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link href={ROUTES.FINANCIAL_FITNESS}>
                  Calculate My COMPASS Advantage
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 border-border/80 bg-transparent hover:bg-white/5" asChild>
                <Link href="#sarathi">Talk to Sarathi</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5"
          >
            <JourneyCard
              {...hero.journeyCards.borrow}
              variant="borrow"
              href={ROUTES.LOAN_PRODUCTS}
            />
            <JourneyCard
              {...hero.journeyCards.invest}
              variant="invest"
              href={ROUTES.RESOURCES}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
