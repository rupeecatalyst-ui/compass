"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { discoveryCopy } from "@/config/home-loan-discovery";
import type { LenderRecommendationResult } from "@/services/catalyst-one/types";
import { publishedCommercialLabel } from "@/lib/customer-journey-order";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

const CIBIL_NOT_KNOWN_DISCLAIMER =
  "Indicative pricing: The interest rate and lender eligibility shown are indicative. Final pricing and approval will depend on the applicant’s CIBIL score, income and obligations, property assessment, lender policy and other applicable credit parameters.";

function scoreLabel(lender: LenderRecommendationResult): string {
  if (lender.matchScore == null) return `Rank ${lender.rank}`;
  return `Rank ${lender.rank} · ${lender.matchScore}`;
}

function LenderRow({
  lender,
  selected,
  onSelect,
}: {
  lender: LenderRecommendationResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const offer = publishedCommercialLabel(lender.tentativeOffer);
  const requested = publishedCommercialLabel(lender.requestedAmount);
  const roi = publishedCommercialLabel(lender.interestRate);
  const emi = publishedCommercialLabel(lender.estimatedEmi);
  const tenure = publishedCommercialLabel(lender.tenure);
  const time = publishedCommercialLabel(lender.processingTime);
  const reason = lender.reasons[0] || lender.whyThisRecommendation || "";

  return (
    <article
      className={cn(
        "rounded-xl border px-3 py-2.5 sm:px-4",
        selected ? "border-primary/45 bg-primary/[0.08]" : "border-white/[0.08] bg-white/[0.02]",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{lender.name}</p>
          <p className="text-[11px] text-muted-foreground">{scoreLabel(lender)}</p>
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold",
            selected
              ? "bg-primary text-primary-foreground"
              : "border border-white/15 text-foreground hover:border-primary/40",
          )}
        >
          {selected ? <Check className="h-3.5 w-3.5" /> : null}
          {selected ? "Selected" : "Select this lender"}
        </button>
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Field label="Eligible offer" value={offer} />
        <Field label="Requested" value={requested} />
        <Field label="ROI" value={roi} />
        <Field label="EMI" value={emi} />
        <Field label="Tenure" value={tenure} />
        <Field label="Processing" value={time} />
      </dl>
      {reason ? <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{reason}</p> : null}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-[11px] leading-snug">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
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
  const {
    intelligence,
    intelligenceLoading,
    intelligenceError,
    goNext,
    productCode,
    answers,
    selectMatchedLender,
  } = useDiscovery();
  const reduceMotion = useReducedMotion();
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
  const selectedName = answers.selectedLenderName ?? "";

  return (
    <motion.div
      key="lenders"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: smoothEase }}
      className="flex flex-1 flex-col"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {showAssisted ? assisted?.headline || c.heading : c.heading}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{showAssisted ? assisted?.body : c.subtitle}</p>
      </div>

      <div className="mx-auto mt-6 w-full space-y-2">
        {showAssisted ? (
          <TalkToExpertPanel />
        ) : unavailable ? (
          <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {intelligenceError ||
                intelligence?.recommendationsMessage ||
                "We are preparing your lender guidance. A Rupee Catalyst advisor will share suitable options shortly."}
            </p>
          </div>
        ) : (
          lenders.map((lender) => (
            <LenderRow
              key={lender.id}
              lender={lender}
              selected={selectedName === lender.name && (answers.selectedLenderRef || "") === (lender.id.startsWith("rank:") ? "" : lender.id)}
              onSelect={() =>
                selectMatchedLender({
                  lenderRef: lender.id.startsWith("rank:") ? "" : lender.id,
                  lenderName: lender.name,
                  programmeRef: lender.programmeRef ?? "",
                })
              }
            />
          ))
        )}
        {intelligence?.cibilNotKnownDisclaimer && lenders.length > 0 ? (
          <p className="pt-2 text-xs leading-relaxed text-muted-foreground">{CIBIL_NOT_KNOWN_DISCLAIMER}</p>
        ) : null}
      </div>

      {lenders.length > 0 || unavailable || showAssisted ? (
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="h-12 px-10"
            disabled={lenders.length > 0 && !selectedName}
            onClick={goNext}
          >
            {c.continueCta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}
