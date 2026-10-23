"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { discoveryCopy } from "@/config/home-loan-discovery";
import type { LenderRecommendationResult } from "@/services/catalyst-one/types";
import { COMMERCIAL_UNAVAILABLE, publishedCommercialLabel } from "@/lib/customer-journey-order";
import { LENDER_MATCH_LOADING_MESSAGES } from "@/lib/lender-match-request";
import {
  lenderPreferencesFromAnswers,
  sameLenderPreference,
  type LenderPreference,
} from "@/lib/lender-preferences";
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
  preference,
  onSelect,
}: {
  lender: LenderRecommendationResult;
  preference: number | null;
  onSelect: () => void;
}) {
  const selected = preference != null;
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
        "min-w-0 rounded-xl border px-3 py-2.5 sm:px-4",
        selected ? "border-primary/45 bg-primary/[0.08]" : "border-white/[0.08] bg-white/[0.02]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{lender.name}</p>
          <p className="text-xs text-muted-foreground">{scoreLabel(lender)}</p>
          {preference ? (
            <span className="mt-1 inline-flex w-fit rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              Preference {preference}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(
            "inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold sm:w-auto",
            selected
              ? "bg-primary text-primary-foreground"
              : "border border-white/15 text-foreground hover:border-primary/40",
          )}
        >
          {selected ? <Check className="h-4 w-4" /> : null}
          {selected ? "Selected" : "Select this lender"}
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3">
        <Field label="Eligible offer" value={offer} />
        <Field label="Requested amount" value={requested} />
        <Field label="ROI" value={roi} emphasize />
        <Field label="EMI" value={emi} />
        <Field label="Tenure" value={tenure} />
        <Field label="Processing time" value={time} />
      </dl>
      {reason ? <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{reason}</p> : null}
    </article>
  );
}

function Field({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  const unavailable = value === COMMERCIAL_UNAVAILABLE;
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-snug text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-sm font-medium leading-snug sm:text-base",
          emphasize && !unavailable ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </dd>
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
    loadIntelligence,
    goNext,
    productCode,
    answers,
    selectMatchedLender,
  } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const c = discoveryCopy.lenders;
  const isHlBt = productCode === "home-loan" || productCode === "home-loan-balance-transfer";
  const lenders = useMemo(() => intelligence?.lenders ?? [], [intelligence?.lenders]);
  const [preferenceNotice, setPreferenceNotice] = useState<string | null>(null);
  const preferences = lenderPreferencesFromAnswers(answers);
  const assisted = intelligence?.assistedOffer ?? null;
  const showAssisted = isHlBt && Boolean(assisted) && lenders.length === 0;
  const unavailable =
    !intelligenceLoading &&
    !showAssisted &&
    (intelligence?.recommendationsStatus === "unavailable" ||
      intelligence?.recommendationsStatus === "pending" ||
      lenders.length === 0);

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

      <div className="mx-auto mt-6 w-full min-w-0 space-y-2">
        {intelligenceLoading && lenders.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center" aria-live="polite" aria-busy="true">
            <LoaderCircle className={`h-6 w-6 text-primary ${reduceMotion ? "" : "animate-spin"}`} />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{LENDER_MATCH_LOADING_MESSAGES[0]}</p>
          </div>
        ) : showAssisted ? (
          <TalkToExpertPanel />
        ) : unavailable ? (
          <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {intelligenceError ||
                intelligence?.recommendationsMessage ||
                "We are preparing your lender guidance. A Rupee Catalyst advisor will share suitable options shortly."}
            </p>
            {intelligenceError ? (
              <Button size="lg" className="h-12 w-full" onClick={() => void loadIntelligence()}>
                Try again
              </Button>
            ) : null}
          </div>
        ) : (
          lenders.map((lender) => {
            const choice: LenderPreference = {
              lenderRef: lender.id.startsWith("rank:") ? "" : lender.id,
              lenderName: lender.name,
              programmeRef: lender.programmeRef ?? "",
            };
            const preferenceIndex = preferences.findIndex((item) => sameLenderPreference(item, choice));
            return (
            <LenderRow
              key={lender.id}
              lender={lender}
              preference={preferenceIndex >= 0 ? preferenceIndex + 1 : null}
              onSelect={() => {
                const status = selectMatchedLender(choice);
                setPreferenceNotice(
                  status === "limit"
                    ? "You can choose up to three lenders. Remove one to choose a different lender."
                    : null,
                );
              }}
            />
            );
          })
        )}
        {preferenceNotice ? (
          <p role="status" className="pt-2 text-sm text-foreground">{preferenceNotice}</p>
        ) : null}
        {intelligence?.cibilNotKnownDisclaimer && lenders.length > 0 ? (
          <p className="pt-2 text-xs leading-relaxed text-muted-foreground">{CIBIL_NOT_KNOWN_DISCLAIMER}</p>
        ) : null}
      </div>

      {lenders.length > 0 || unavailable || showAssisted ? (
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="h-12 w-full max-w-md sm:w-auto sm:px-10"
            disabled={lenders.length > 0 && preferences.length === 0}
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
