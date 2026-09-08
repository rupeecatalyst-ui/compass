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

const CIBIL_NOT_KNOWN_DISCLAIMER =
  "Indicative pricing: The interest rate and lender eligibility shown are indicative. Final pricing and approval will depend on the applicant’s CIBIL score, income and obligations, property assessment, lender policy and other applicable credit parameters.";

function LenderCard({ lender, visible }: { lender: LenderRecommendationResult; visible: boolean }) {
  const reduceMotion = useReducedMotion();
  const [openWhy, setOpenWhy] = useState(false);
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
        {lender.matchState ? ` · ${lender.matchState.replace(/_/g, " ")}` : ""}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tentative Offer</p>
          <p className="mt-1 text-sm font-semibold">{lender.tentativeOffer || "Not available"}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Requested</p>
          <p className="mt-1 text-sm font-semibold">{lender.requestedAmount || "Not specified"}</p>
        </div>
        {lender.shortfall ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Shortfall</p>
            <p className="mt-1 text-sm font-semibold">{lender.shortfall}</p>
          </div>
        ) : null}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Percent className="h-3 w-3" />
            Indicative ROI
          </p>
          <p className="mt-1 text-sm font-semibold">{lender.interestRate}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Eligible tenure</p>
          <p className="mt-1 text-sm font-semibold">{lender.tenure || "Not available"}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Indicative EMI</p>
          <p className="mt-1 text-sm font-semibold">{lender.estimatedEmi}</p>
        </div>
        {lender.foir ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Calculated FOIR</p>
            <p className="mt-1 text-sm font-semibold">{lender.foir}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {lender.reasons[0] || lender.whyThisRecommendation}
      </p>

      {lender.whyThisRecommendation ? (
        <button
          type="button"
          className="mt-3 text-left text-xs font-semibold uppercase tracking-wider text-primary"
          onClick={() => setOpenWhy((open) => !open)}
        >
          {openWhy ? "Hide" : "Why this recommendation?"}
        </button>
      ) : null}
      {openWhy ? (
        <p className="mt-2 text-sm text-muted-foreground">{lender.whyThisRecommendation}</p>
      ) : null}
    </motion.article>
  );
}

function TalkToExpertPanel() {
  const { requestTalkToExpert, intelligence } = useDiscovery();
  const [busy, setBusy] = useState(false);
  const sla = intelligence?.expertSla;

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 text-left">
      <p className="text-sm font-medium text-foreground">
        {sla?.borrowerCopy || "Our Home Loan Specialist will contact you within one working hour."}
      </p>
      {sla?.expectedContactAtIso ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Expected contact: {new Date(sla.expectedContactAtIso).toLocaleString("en-IN")}
        </p>
      ) : null}
      <Button
        size="lg"
        className="mt-4 h-11 w-full"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void requestTalkToExpert().finally(() => setBusy(false));
        }}
      >
        Talk to an Expert
      </Button>
    </div>
  );
}

export function DiscoveryLendersStep() {
  const { compassNudge, intelligence, intelligenceLoading, intelligenceError, goNext, productCode } =
    useDiscovery();
  const reduceMotion = useReducedMotion();
  const [revealedCount, setRevealedCount] = useState(0);
  const c = discoveryCopy.lenders;
  const isHlBt = productCode === "home-loan" || productCode === "home-loan-balance-transfer";

  const lenders = useMemo(() => intelligence?.lenders ?? [], [intelligence?.lenders]);
  const assisted = intelligence?.assistedOffer ?? null;
  const showAssisted = isHlBt && Boolean(assisted) && lenders.length === 0;
  const unavailable =
    !intelligenceLoading &&
    !showAssisted &&
    (intelligence?.recommendationsStatus === "unavailable" ||
      intelligence?.recommendationsStatus === "pending" ||
      lenders.length === 0);

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
        <h2 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          {showAssisted ? assisted?.headline || c.heading : c.heading}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {showAssisted ? assisted?.body : c.subtitle}
        </p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-lg space-y-4">
        {showAssisted ? (
          <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-left">
            <p className="text-sm text-muted-foreground">
              Requested amount: {assisted?.requestedAmountRupees != null ? `₹${assisted.requestedAmountRupees.toLocaleString("en-IN")}` : "Not specified"}
            </p>
            <p className="text-sm text-muted-foreground">
              LTV-supported amount: {assisted?.ltvSupportedAmountRupees != null ? `₹${assisted.ltvSupportedAmountRupees.toLocaleString("en-IN")}` : "Unknown until property value is verified"}
            </p>
            {assisted?.eligibilityGapRupees ? (
              <p className="text-sm text-muted-foreground">
                Eligibility gap: ₹{assisted.eligibilityGapRupees.toLocaleString("en-IN")}
              </p>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Specialist Review Required</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {(assisted?.enhancementRoutes ?? []).map((route) => (
                <li key={route}>{route}</li>
              ))}
            </ul>
            <TalkToExpertPanel />
          </div>
        ) : unavailable ? (
          <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {intelligenceError ||
                intelligence?.recommendationsMessage ||
                "We are preparing your lender guidance. A Rupee Catalyst advisor will share suitable options shortly."}
            </p>
            {isHlBt ? <TalkToExpertPanel /> : null}
          </div>
        ) : (
          lenders.map((lender, i) => (
            <LenderCard key={lender.id} lender={lender} visible={i < revealedCount} />
          ))
        )}
        {intelligence?.cibilNotKnownDisclaimer && lenders.length > 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{CIBIL_NOT_KNOWN_DISCLAIMER}</p>
        ) : null}
        {lenders.length > 0 && isHlBt ? <TalkToExpertPanel /> : null}
      </div>

      {(revealedCount >= lenders.length && lenders.length > 0) || unavailable || showAssisted ? (
        <div className="mt-10 flex justify-center">
          <Button size="lg" className="h-12 px-10" onClick={goNext}>
            {c.continueCta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}
