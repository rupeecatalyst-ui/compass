"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DiscoveryCompass } from "@/components/home-loan-experience/discovery/discovery-compass";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { discoveryCopy } from "@/config/home-loan-discovery";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";
import { compassAdvantageIsDisplayable } from "@/services/catalyst-one/types";

export function DiscoveryAdvantageStep() {
  const { compassNudge, intelligence, intelligenceLoading, intelligenceError, goNext, loadIntelligence } =
    useDiscovery();
  const reduceMotion = useReducedMotion();
  const c = discoveryCopy.advantage;

  const advantage = intelligence?.advantage;

  return (
    <motion.div
      key="advantage"
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <DiscoveryCompass nudgeKey={compassNudge} size="lg" />

        <h2 className="mt-8 text-2xl font-semibold tracking-tight sm:text-3xl">{c.heading}</h2>

        {intelligenceLoading || (!advantage && !intelligenceError) ? (
          <p className="mt-6 text-sm text-muted-foreground">{c.loading}</p>
        ) : intelligenceError ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">{intelligenceError}</p>
            <Button size="lg" className="h-12" onClick={() => void loadIntelligence()}>
              Try Again
            </Button>
          </div>
        ) : !compassAdvantageIsDisplayable(advantage) ? (
          <div className="mx-auto mt-10 max-w-lg space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              You can continue — lender guidance and document collection are not affected.
            </p>
          </div>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, ease: smoothEase }}
            className="mx-auto mt-10 w-full max-w-lg rounded-3xl border border-primary/35 bg-primary/[0.08] p-8 shadow-[0_0_64px_-20px_var(--glow)] sm:p-10"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {advantage.title}
            </p>
            <p className="mt-4 text-4xl font-bold tracking-tight text-gradient sm:text-5xl">
              {advantage.amountFormatted}
            </p>
            {advantage.percentageBenefitAmount || advantage.fixedBenefitComponents?.length ? (
              <dl className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
                {advantage.percentageBenefitAmount ? (
                  <div className="flex justify-between gap-4">
                    <dt>Percentage benefit</dt>
                    <dd className="font-medium text-foreground">
                      ₹{Number(advantage.percentageBenefitAmount).toLocaleString("en-IN")}
                    </dd>
                  </div>
                ) : null}
                {(advantage.fixedBenefitComponents ?? []).map((component) => (
                  <div key={component.name} className="flex justify-between gap-4">
                    <dt>{component.name}</dt>
                    <dd className="font-medium text-foreground">
                      ₹{Number(component.amountRupees).toLocaleString("en-IN")}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="mt-6 text-left text-sm leading-relaxed text-muted-foreground">
              {advantage.customerExplanation || advantage.disclaimer}
            </p>
          </motion.div>
        ) : (
          <p className="mt-8 max-w-md text-sm text-muted-foreground">
            We need a little more information before we can estimate your COMPASS Advantage.
          </p>
        )}

        {!intelligenceLoading && !intelligenceError ? (
          <Button size="lg" className="mt-10 h-12 px-10" onClick={goNext}>
            {c.showMatches}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
