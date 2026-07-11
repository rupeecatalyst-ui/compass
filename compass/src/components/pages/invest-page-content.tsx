"use client";

import { Gem, Landmark, LineChart, Target } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { GoalTransitionCard } from "@/components/platform/goal-transition-card";
import { investGoals, investTransition } from "@/config/platform-architecture";
import { smoothEase } from "@/lib/animations";

const iconMap = {
  chart: LineChart,
  landmark: Landmark,
  gem: Gem,
  target: Target,
} as const;

/** Level 2 — Invest goal selection. Same orchestration philosophy as Borrow. */
export function InvestPageContent() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#05070c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(74,222,128,0.06),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.3] [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-20 sm:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: smoothEase }}
          className="mb-10 text-center sm:mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent/80">Invest</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl">
            {investTransition.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {investTransition.subtext}
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {investGoals.map((goal, index) => {
            const Icon = iconMap[goal.icon];
            return (
              <GoalTransitionCard
                key={goal.id}
                title={goal.title}
                insight={goal.insight}
                href={goal.href}
                icon={<Icon className="h-6 w-6" />}
                index={index}
                variant="invest"
              />
            );
          })}
        </div>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-10 text-center text-sm text-muted-foreground"
        >
          Investment Discovery Journeys are opening soon.
        </motion.p>
      </div>
    </div>
  );
}
