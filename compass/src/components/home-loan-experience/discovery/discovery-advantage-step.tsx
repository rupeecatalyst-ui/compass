"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { DiscoveryCompass } from "@/components/home-loan-experience/discovery/discovery-compass";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { discoveryCopy } from "@/config/home-loan-discovery";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";
import { compassAdvantageIsDisplayable } from "@/services/catalyst-one/types";
import { authoritativeRequestedAmountRupees } from "@/lib/declarable-journey-answers";
import { LENDER_MATCH_LOADING_MESSAGES, lenderMatchAction } from "@/lib/lender-match-request";

function formatInrWhole(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function DiscoveryAdvantageStep() {
  const {
    answers,
    compassNudge,
    intelligence,
    intelligenceLoading,
    intelligenceError,
    goNext,
    loadIntelligence,
    completeJourney,
  } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const c = discoveryCopy.advantage;

  const advantage = intelligence?.advantage;
  const requestedFromAnswersAmount = authoritativeRequestedAmountRupees(answers);
  const requestedFromCalculation = formatInrWhole(advantage?.requestedLoanAmount);
  const requestedFromAnswers = formatInrWhole(requestedFromAnswersAmount);
  const requestedLoanAmount = advantage?.requestedLoanAmount;
  const calculationMatchesCurrentAmount =
    requestedFromAnswersAmount != null &&
    requestedLoanAmount != null &&
    requestedLoanAmount !== "" &&
    Math.round(Number(requestedLoanAmount)) === requestedFromAnswersAmount;
  const displayable =
    compassAdvantageIsDisplayable(advantage) && calculationMatchesCurrentAmount;
  const ready = Boolean(intelligence) && !intelligenceError;
  const [messageIndex, setMessageIndex] = useState(0);
  const opened = useRef(false);
  const mounted = useRef(true);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!intelligenceLoading || reduceMotion) return;
    const timer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % LENDER_MATCH_LOADING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [intelligenceLoading, reduceMotion]);

  const openMatches = () => {
    if (!mounted.current || opened.current) return;
    opened.current = true;
    goNext();
  };

  const onBestLenderMatch = () => {
    const action = lenderMatchAction({
      loading: intelligenceLoading,
      failed: Boolean(intelligenceError),
      ready,
    });
    if (action === "wait") return;
    if (action === "open") {
      openMatches();
      return;
    }
    void loadIntelligence().then((ok) => {
      if (!ok || !mounted.current) return;
      completeJourney();
      advanceTimer.current = window.setTimeout(openMatches, 2400);
    });
  };

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

        {intelligenceLoading ? (
          <div className="mt-8 flex flex-col items-center" aria-live="polite" aria-busy="true">
            <LoaderCircle className={`h-6 w-6 text-primary ${reduceMotion ? "" : "animate-spin"}`} />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              {LENDER_MATCH_LOADING_MESSAGES[messageIndex]}
            </p>
          </div>
        ) : intelligenceError ? (
          <p className="mt-8 max-w-md text-sm text-muted-foreground">{intelligenceError}</p>
        ) : !ready ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Your COMPASS Advantage is ready to calculate from the details you have shared.
          </p>
        ) : advantage?.status === "not_available" || !advantage?.eligible ? (
          <div className="mx-auto mt-10 max-w-lg space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              COMPASS Advantage is not available for this request yet.
            </p>
            <p className="text-xs text-muted-foreground">
              You can continue — lender guidance and document collection are not affected.
            </p>
          </div>
        ) : displayable ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, ease: smoothEase }}
            className="mx-auto mt-10 w-full max-w-lg rounded-3xl border border-primary/35 bg-primary/[0.08] p-8 shadow-[0_0_64px_-20px_var(--glow)] sm:p-10"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {c.requestedAmountLabel}
            </p>
            <p className="mt-2 text-lg font-medium text-foreground sm:text-xl">
              {requestedFromCalculation || requestedFromAnswers}
            </p>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {c.resultTitle}
            </p>
            <p className="mt-4 text-4xl font-bold tracking-tight text-gradient sm:text-5xl">
              {advantage.amountFormatted}
            </p>
            <p className="mt-6 text-left text-sm leading-relaxed text-muted-foreground">
              {c.eligibilityNote}
            </p>
          </motion.div>
        ) : (
          <p className="mt-8 max-w-md text-sm text-muted-foreground">
            We need a little more information before we can estimate your COMPASS Advantage.
          </p>
        )}

        <Button
          size="lg"
          className="mt-10 h-12 w-full max-w-md sm:w-auto sm:px-10"
          disabled={intelligenceLoading}
          onClick={onBestLenderMatch}
        >
          {intelligenceError ? "Try again" : c.showMatches}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
