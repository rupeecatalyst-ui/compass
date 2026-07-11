"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DiscoveryCompass } from "@/components/home-loan-experience/discovery/discovery-compass";
import { useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { ANALYSIS_PHASES } from "@/config/home-loan-discovery";
import { analysisMessageMs, phaseTransitionMs } from "@/lib/discovery-orchestration";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function DiscoveryAnalysisStep() {
  const { goNext, compassNudge, completeJourney, loadIntelligence } = useDiscovery();
  const reduceMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [resolving, setResolving] = useState(false);

  const allMessages = useMemo(
    () => ANALYSIS_PHASES.flatMap((phase) => phase.messages),
    [],
  );

  const currentPhase = ANALYSIS_PHASES[phaseIndex];
  const activeMessage = currentPhase?.messages[messageIndex] ?? "";
  const completedCount =
    ANALYSIS_PHASES.slice(0, phaseIndex).reduce((n, p) => n + p.messages.length, 0) + messageIndex;

  const phaseMessages = useMemo(
    () => (currentPhase ? currentPhase.messages.slice(0, messageIndex + 1) : []),
    [currentPhase, messageIndex],
  );

  useEffect(() => {
    if (reduceMotion) {
      setResolving(true);
      void loadIntelligence().then(() => {
        completeJourney();
        goNext();
      });
      return;
    }

    const phase = ANALYSIS_PHASES[phaseIndex];
    if (!phase || resolving) return;

    const currentText = phase.messages[messageIndex] ?? "";
    const dwellMs = analysisMessageMs(currentText, allMessages);

    if (messageIndex < phase.messages.length - 1) {
      const t = window.setTimeout(() => setMessageIndex((m) => m + 1), dwellMs);
      return () => clearTimeout(t);
    }

    if (phaseIndex < ANALYSIS_PHASES.length - 1) {
      const t = window.setTimeout(() => {
        setPhaseIndex((p) => p + 1);
        setMessageIndex(0);
      }, phaseTransitionMs(phase.id));
      return () => clearTimeout(t);
    }

    const t = window.setTimeout(() => {
      setResolving(true);
      void loadIntelligence().then(() => {
        completeJourney();
        goNext();
      });
    }, dwellMs);
    return () => clearTimeout(t);
  }, [
    phaseIndex,
    messageIndex,
    goNext,
    completeJourney,
    loadIntelligence,
    reduceMotion,
    allMessages,
    resolving,
  ]);

  const isIntelligencePhase = currentPhase?.id === "intelligence";

  return (
    <motion.div
      key="analysing"
      initial={reduceMotion ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <DiscoveryCompass
          nudgeKey={compassNudge + completedCount}
          size="lg"
          needleAngle={isIntelligencePhase ? 8 : 12 + completedCount * 3}
        />

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          {currentPhase?.label}
        </p>

        <motion.h2
          key={`${phaseIndex}-${messageIndex}-${activeMessage}`}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="mt-4 min-h-[3rem] max-w-md px-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {resolving ? "Preparing your COMPASS Advantage..." : activeMessage}
        </motion.h2>

        <div className="mt-10 flex gap-2">
          {ANALYSIS_PHASES.map((phase, i) => (
            <span
              key={phase.id}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i < phaseIndex ? "w-8 bg-primary/70" : i === phaseIndex ? "w-10 bg-primary" : "w-6 bg-white/10",
              )}
              aria-hidden
            />
          ))}
        </div>

        {isIntelligencePhase ? (
          <ul className="mt-10 w-full max-w-sm space-y-2 text-left" aria-live="polite">
            {phaseMessages.map((text, i) => {
              const isCurrent = i === messageIndex;
              return (
                <motion.li
                  key={text}
                  initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: smoothEase }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-xs sm:text-sm",
                    isCurrent
                      ? "border-primary/35 bg-primary/[0.08] text-foreground"
                      : "border-primary/20 bg-primary/[0.04] text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isCurrent ? "bg-primary shadow-[0_0_8px_var(--glow)]" : "bg-primary/50",
                    )}
                  />
                  {text}
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-8 max-w-xs text-xs text-muted-foreground" aria-live="polite">
            {phaseIndex === 1
              ? "Using what you've shared — nothing assumed."
              : phaseIndex === 2
                ? "Matching products to your profile."
                : "Almost ready."}
          </p>
        )}
      </div>
    </motion.div>
  );
}
