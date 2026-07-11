"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Percent } from "lucide-react";
import { DiscoveryCompass } from "@/components/home-loan-experience/discovery/discovery-compass";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { discoveryCopy } from "@/config/home-loan-discovery";
import type { LenderRecommendationResult } from "@/services/catalyst-one/types";
import { revealItemDelayMs } from "@/lib/discovery-orchestration";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<LenderRecommendationResult["tier"], string> = {
  best: "Best Match",
  strong: "Strong Match",
  alternative: "Alternative Match",
};

function LenderCard({ lender, visible }: { lender: LenderRecommendationResult; visible: boolean }) {
  const reduceMotion = useReducedMotion();
  if (!visible) return null;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: smoothEase }}
      className={cn(
        "rounded-2xl border p-5 sm:p-6",
        lender.tier === "best"
          ? "border-primary/35 bg-primary/[0.08] shadow-[0_0_48px_-16px_var(--glow)]"
          : "border-white/[0.08] bg-white/[0.02]",
      )}
    >
      <p className="text-xl font-semibold tracking-tight text-foreground">{lender.name}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {TIER_LABELS[lender.tier]}
      </p>

      <div className="mt-4 flex items-center justify-between gap-4">
        {lender.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lender.logoUrl} alt="" className="h-11 w-11 rounded-xl object-contain" />
        ) : (
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-bold",
              lender.tier === "best"
                ? "border-primary/35 bg-primary/15 text-primary"
                : "border-white/10 bg-white/[0.04] text-foreground",
            )}
          >
            {lender.initials}
          </span>
        )}
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Match</p>
          <p className="text-2xl font-bold text-primary">{lender.matchScore}%</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Percent className="h-3 w-3" />
            Rate
          </p>
          <p className="mt-1 text-sm font-semibold">{lender.interestRate}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. EMI</p>
          <p className="mt-1 text-sm font-semibold">{lender.estimatedEmi}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Processing</p>
          <p className="mt-1 text-sm font-semibold">{lender.processingTime}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-2 text-left">
        {lender.reasons.slice(0, 3).map((reason) => (
          <li key={reason} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
            {reason}
          </li>
        ))}
      </ul>

      <Button variant="outline" size="sm" className="mt-5 h-10 bg-transparent">
        View Details
      </Button>
    </motion.article>
  );
}

export function DiscoveryLendersStep() {
  const { compassNudge, intelligence, activateSarathi } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const [revealedCount, setRevealedCount] = useState(0);
  const c = discoveryCopy.lenders;

  const lenders = useMemo(() => intelligence?.lenders ?? [], [intelligence?.lenders]);

  useEffect(() => {
    if (reduceMotion) {
      setRevealedCount(lenders.length);
      return;
    }
    if (revealedCount >= lenders.length) return;

    const prev = revealedCount > 0 ? TIER_LABELS[lenders[revealedCount - 1].tier] : "";
    const delay = revealedCount === 0 ? 500 : revealItemDelayMs(prev, revealedCount - 1);
    const t = window.setTimeout(() => setRevealedCount((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [revealedCount, lenders, reduceMotion]);

  return (
    <motion.div
      key="lenders"
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex flex-1 flex-col"
    >
      <div className="text-center">
        <DiscoveryCompass nudgeKey={compassNudge} size="md" />
        <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{c.heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{c.subtitle}</p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-lg space-y-4">
        {lenders.map((lender, i) => (
          <LenderCard key={lender.id} lender={lender} visible={i < revealedCount} />
        ))}
      </div>

      {revealedCount >= lenders.length && lenders.length > 0 ? (
        <div className="mt-10 flex justify-center">
          <Button size="lg" className="h-12 px-10" onClick={activateSarathi}>
            {c.reviewSarathi}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}
