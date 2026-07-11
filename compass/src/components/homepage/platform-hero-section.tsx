"use client";

import * as React from "react";
import Link from "next/link";
import type { MotionValue } from "framer-motion";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
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

function HeroSignatureCompass({
  x,
  y,
  rotate,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rotate: MotionValue<number>;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        style={{ x, y, rotate }}
        className="absolute left-1/2 top-[40%] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 sm:top-[42%] sm:h-[48rem] sm:w-[48rem] lg:top-1/2 lg:h-[52rem] lg:w-[52rem]"
      >
        <div className="absolute inset-0 rounded-full border border-primary/20 bg-gradient-to-br from-white/[0.04] via-primary/[0.02] to-transparent opacity-90 shadow-[inset_0_0_80px_rgba(45,212,191,0.08)] backdrop-blur-md" />
        <div className="absolute inset-8 rounded-full border border-white/15 opacity-80" />
        <div className="absolute inset-20 rounded-full border border-primary/15 opacity-70" />
        <div className="absolute inset-32 rounded-full border border-white/10 opacity-60" />
        {[0, 45, 90, 135].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2 h-[46%] w-px origin-bottom -translate-x-1/2 bg-gradient-to-t from-primary/25 to-transparent opacity-50"
            style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
          />
        ))}
        <motion.div
          className="absolute left-1/2 top-1/2 h-[44%] w-[2px] -translate-x-1/2 origin-bottom rounded-full bg-gradient-to-b from-primary/80 via-primary/40 to-transparent shadow-[0_0_24px_rgba(45,212,191,0.35)]"
          style={{ marginTop: "-44%" }}
          animate={reduceMotion ? undefined : { rotate: [0, 10, -5, 0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-[#05070c] shadow-[0_0_20px_rgba(45,212,191,0.25)]" />
        <div className="absolute inset-0 rounded-full opacity-[0.14] shadow-[0_0_160px_20px_rgba(45,212,191,0.12)]" />
      </motion.div>
      <div className="absolute left-1/2 top-[40%] h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-3xl sm:top-[42%] lg:top-1/2" />
    </div>
  );
}

function JourneyCard({
  title,
  subtitle,
  description,
  variant,
  href,
}: {
  title: string;
  subtitle: string;
  description: string;
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
      <Link href={href} className="absolute inset-0 z-10" aria-label={`${title} journey`} />
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
        <div
          className={cn(
            "mt-6 inline-flex items-center gap-2 text-sm font-medium transition-colors",
            variant === "borrow" ? "text-primary" : "text-accent",
          )}
          aria-hidden
        >
          Begin
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  );
}

function PlatformAmbientIntelligence() {
  const reduceMotion = useReducedMotion();
  const insights = [
    "Every recommendation has a reason.",
    "Guidance before paperwork.",
    "Confidence before commitment.",
    "Good decisions begin with clarity.",
    "The right lender depends on your profile.",
  ] as const;

  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % insights.length);
    }, reduceMotion ? 6000 : 5200);
    return () => window.clearInterval(t);
  }, [reduceMotion, insights.length]);

  return (
    <div className="relative h-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={insights[index]}
          initial={reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: "blur(6px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-sm text-muted-foreground"
        >
          {insights[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/** Product-neutral platform hero — Borrow and Invest only. */
export function PlatformHeroSection() {
  const { hero } = homepageV2;
  const reduceMotion = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useTransform(mx, [-0.5, 0.5], [-18, 18]);
  const y = useTransform(my, [-0.5, 0.5], [-14, 14]);
  const rotate = useTransform(mx, [-0.5, 0.5], [-6, 6]);

  return (
    <section
      className="relative overflow-hidden pt-8 sm:pt-12 lg:pt-16 pb-16 sm:pb-20"
      onMouseMove={(e) => {
        if (reduceMotion) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width - 0.5;
        const ry = (e.clientY - rect.top) / rect.height - 0.5;
        mx.set(Math.max(-0.5, Math.min(0.5, rx)));
        my.set(Math.max(-0.5, Math.min(0.5, ry)));
      }}
    >
      <HeroSignatureCompass x={x} y={y} rotate={rotate} />
      <div className="pointer-events-none absolute inset-0 ambient-glow" />
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-40" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
          <motion.div variants={staggerContainer} initial={false} animate="animate" className="space-y-7 sm:space-y-8">
            <motion.div variants={staggerItem} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Rupee Catalyst
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                COMPASS
                <span className="text-primary/60">·</span>
                {hero.eyebrow}
              </div>
            </motion.div>

            <motion.div variants={staggerItem} className="space-y-2">
              <h1 className="text-[2rem] font-bold tracking-tight leading-[1.15] sm:text-5xl lg:text-6xl xl:text-[3.75rem] xl:leading-[1.08]">
                <span className="block text-gradient-subtle">{hero.headlineLine2}</span>
                {hero.headlineAccent ? (
                  <span className="mt-2 block text-gradient sm:mt-3">{hero.headlineAccent}</span>
                ) : null}
              </h1>
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg"
            >
              {hero.subheadline}
            </motion.p>

            <motion.div variants={staggerItem} className="max-w-xl">
              <PlatformAmbientIntelligence />
            </motion.div>

            <motion.div variants={staggerItem} className="flex flex-wrap gap-2.5">
              {hero.trustIndicators.map((item) => {
                const Icon = trustIcons[item.icon];
                return (
                  <div
                    key={item.label}
                    className="group/cred relative flex items-center gap-2 rounded-full border border-border/60 bg-surface/50 px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {item.label}
                    {"tooltip" in item && item.tooltip ? (
                      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-[16rem] -translate-x-1/2 rounded-2xl border border-white/[0.10] bg-[#05070c]/95 px-4 py-3 text-[11px] leading-relaxed text-foreground/80 opacity-0 shadow-[0_16px_60px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-opacity duration-200 group-hover/cred:opacity-100 group-hover/cred:pointer-events-none">
                        <p className="text-[11px] font-semibold text-foreground">{item.label}</p>
                        <p className="mt-1 text-foreground/70">{item.tooltip}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </motion.div>

            <motion.div variants={staggerItem} className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link href={ROUTES.BORROW}>
                  {hero.journeyCards.borrow.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/15 bg-white/[0.03] text-foreground hover:bg-white/[0.06] hover:border-white/25"
                asChild
              >
                <Link href={ROUTES.INVEST}>{hero.journeyCards.invest.cta}</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5"
          >
            <JourneyCard {...hero.journeyCards.borrow} variant="borrow" href={ROUTES.BORROW} />
            <JourneyCard {...hero.journeyCards.invest} variant="invest" href={ROUTES.INVEST} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
