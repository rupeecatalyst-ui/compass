"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonalLoanInsightStage } from "@/components/personal-loan/personal-loan-insight-stage";
import { personalLoanLanding } from "@/config/personal-loan-landing";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/lib/animations";

export function PersonalLoanHeroSection() {
  const { hero } = personalLoanLanding;
  const reduceMotion = useReducedMotion();

  const onDiscoverClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (!reduceMotion) {
      window.dispatchEvent(new CustomEvent("compass:navigate", { detail: { to: "advantage-conversation" } }));
    }
    document.getElementById("advantage-conversation")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-12 lg:pt-16 pb-9 sm:pb-11 lg:pb-12">
      <div className="pointer-events-none absolute inset-0 ambient-glow" />
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(59,130,246,0.10),transparent)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <motion.div
            variants={staggerContainer}
            initial={false}
            animate="animate"
            className="space-y-6 text-left sm:space-y-7"
          >
            <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                {hero.eyebrow}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                <Zap className="h-3.5 w-3.5" aria-hidden />
                Fast & flexible
              </span>
            </motion.div>

            <motion.div variants={staggerItem} className="space-y-3">
              <h1 className="text-[2rem] font-bold tracking-tight leading-[1.15] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1] xl:text-[3.5rem]">
                <span className="block text-gradient-subtle">{hero.headline}</span>
                <span className="mt-2 block text-gradient sm:mt-3">{hero.headlineAccent}</span>
              </h1>
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg"
            >
              {hero.subheadline}
            </motion.p>

            <motion.p variants={staggerItem} className="text-sm font-medium tracking-wide text-primary">
              {hero.valueProps[0]}
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-6 sm:px-8" asChild>
                <a href="#advantage-conversation" onClick={onDiscoverClick}>
                  <span className="sm:hidden">{hero.primaryCtaShort}</span>
                  <span className="hidden sm:inline">{hero.primaryCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-border/80 bg-transparent hover:bg-white/5"
                asChild
              >
                <Link href={ROUTES.CONTACT}>{hero.secondaryCta}</Link>
              </Button>
            </motion.div>

            <motion.div variants={staggerItem} className="lg:hidden">
              <PersonalLoanInsightStage />
            </motion.div>
          </motion.div>

          <motion.div
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <PersonalLoanInsightStage />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

