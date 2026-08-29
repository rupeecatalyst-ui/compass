"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { discoveryCopy } from "@/config/home-loan-discovery";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";

export function DiscoveryConfirmationStep() {
  const { submissionResult, closeDiscovery, activateSarathi } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const c = discoveryCopy.confirmation;

  if (!submissionResult) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Preparing your confirmation...
      </div>
    );
  }

  return (
    <motion.div
      key="confirmation"
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </span>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{c.heading}</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {submissionResult.message}
      </p>

      <div className="mt-8 w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {c.referenceLabel}
        </p>
        <p className="mt-2 text-xl font-semibold text-primary">{submissionResult.reference}</p>
      </div>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {c.nextStepsTitle}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>Our team will review your application and contact you on your registered mobile.</li>
          <li>
            You can reach us at {siteConfig.contactPhone} or {siteConfig.contactEmail} for updates.
          </li>
          {submissionResult.pendingItems.length > 0 ? (
            <li>{submissionResult.pendingItems.join(" · ")}</li>
          ) : null}
        </ul>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="h-12 px-10" onClick={closeDiscovery}>
          {c.doneCta}
        </Button>
        <Button size="lg" variant="outline" className="h-12 bg-transparent px-10" onClick={activateSarathi}>
          {c.sarathiCta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
