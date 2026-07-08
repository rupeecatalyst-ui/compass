"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Compass, ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/homepage/shared/section-reveal";
import { Button } from "@/components/ui/button";
import { homeLoanConversation } from "@/config/home-loan-conversation";
import { ROUTES } from "@/constants/routes";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Phase = "welcome" | "questions" | "analysis" | "result";

function JourneyRail({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="mb-8 grid gap-2 sm:grid-cols-4">
      {homeLoanConversation.journey.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <li
            key={step.id}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition-colors",
              current && "border-primary/35 bg-primary/[0.08]",
              done && "border-primary/20 bg-primary/[0.04]",
              !current && !done && "border-border/50 bg-surface/30",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {done ? "Done" : current ? "Now" : "Next"}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium leading-snug sm:text-sm",
                current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function AdvantageConversationSection() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions = homeLoanConversation.questions;
  const currentQuestion = questions[questionIndex];
  const journeyIndex =
    phase === "welcome" || phase === "questions"
      ? phase === "welcome"
        ? 0
        : 1
      : phase === "analysis"
        ? 2
        : 3;

  useEffect(() => {
    if (phase !== "analysis") return;

    setAnalysisStep(0);
    const timers: number[] = [];
    homeLoanConversation.analysis.steps.forEach((_, index) => {
      timers.push(
        window.setTimeout(
          () => setAnalysisStep(index + 1),
          (index + 1) * (reduceMotion ? 200 : 700),
        ),
      );
    });
    timers.push(
      window.setTimeout(
        () => setPhase("result"),
        (homeLoanConversation.analysis.steps.length + 1) * (reduceMotion ? 220 : 750),
      ),
    );

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [phase, reduceMotion]);

  const selectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    if (questionIndex < questions.length - 1) {
      window.setTimeout(() => setQuestionIndex((i) => i + 1), reduceMotion ? 80 : 220);
    } else {
      window.setTimeout(() => setPhase("analysis"), reduceMotion ? 100 : 280);
    }
  };

  const restart = () => {
    setPhase("welcome");
    setQuestionIndex(0);
    setAnalysisStep(0);
    setAnswers({});
  };

  return (
    <SectionReveal id="advantage-conversation" className="relative scroll-mt-24">
      <div id="sarathi" className="pointer-events-none absolute -top-24" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(45,212,191,0.08),transparent)]" />

      <div className="relative mx-auto max-w-3xl">
        <JourneyRail activeIndex={journeyIndex} />

        <div className="overflow-hidden rounded-3xl glass-panel p-5 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "welcome" ? (
              <motion.div
                key="welcome"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: smoothEase }}
                className="space-y-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15">
                    <Compass className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Sarathi
                    </p>
                    <p className="mt-1 text-lg font-semibold">{homeLoanConversation.welcome.greeting}</p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {homeLoanConversation.welcome.headline}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {homeLoanConversation.welcome.body}
                </p>
                <p className="text-xs text-primary/90">{homeLoanConversation.welcome.note}</p>
                <Button
                  size="lg"
                  className="h-12"
                  onClick={() => {
                    setPhase("questions");
                    setQuestionIndex(0);
                  }}
                >
                  {homeLoanConversation.welcome.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ) : null}

            {phase === "questions" && currentQuestion ? (
              <motion.div
                key={currentQuestion.id}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: smoothEase }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/12">
                    <Compass className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Sarathi
                  </p>
                </div>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {currentQuestion.prompt}
                </h2>
                <p className="text-sm text-muted-foreground">{currentQuestion.helper}</p>
                <div className="grid gap-2.5">
                  {currentQuestion.options.map((option) => {
                    const selected = answers[currentQuestion.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectOption(currentQuestion.id, option.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3.5 text-left text-sm transition-all duration-300",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected
                            ? "border-primary/40 bg-primary/[0.1] text-foreground"
                            : "border-border/60 bg-surface/40 hover:border-primary/25 hover:bg-surface/70",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}

            {phase === "analysis" ? (
              <motion.div
                key="analysis"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.4, ease: smoothEase }}
                className="space-y-6"
                aria-live="polite"
              >
                <h2 className="text-2xl font-bold tracking-tight">
                  {homeLoanConversation.analysis.title}
                </h2>
                <ul className="space-y-3">
                  {homeLoanConversation.analysis.steps.map((step, index) => {
                    const complete = analysisStep > index;
                    const current = analysisStep === index;
                    return (
                      <li
                        key={step}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                          complete && "border-primary/30 bg-primary/[0.07] text-foreground",
                          current && "border-primary/20 bg-surface/50 text-foreground",
                          !complete && !current && "border-border/40 text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border",
                            complete
                              ? "border-primary/40 bg-primary/20 text-primary"
                              : "border-border/60",
                          )}
                        >
                          {complete ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        {step}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            ) : null}

            {phase === "result" ? (
              <motion.div
                key="result"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: smoothEase }}
                className="space-y-6"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Strategy revealed
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    {homeLoanConversation.result.title}
                  </h2>
                </div>

                <div className="rounded-2xl border border-border/60 bg-surface/40 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {homeLoanConversation.result.strategyTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {homeLoanConversation.result.strategySummary}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl glass-panel p-4">
                    <p className="text-xs text-muted-foreground">
                      {homeLoanConversation.result.lendersTitle}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm font-medium">
                      {homeLoanConversation.result.lenders.map((lender) => (
                        <li key={lender} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          {lender}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl glass-panel p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Interest Range</p>
                      <p className="mt-1 text-lg font-semibold">
                        {homeLoanConversation.result.interestRange}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated EMI</p>
                      <p className="mt-1 text-lg font-semibold">
                        {homeLoanConversation.result.estimatedEmi}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Approval Confidence</p>
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {homeLoanConversation.result.approvalConfidence}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-5 text-center sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {homeLoanConversation.result.walletTitle}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-gradient sm:text-4xl">
                    {homeLoanConversation.result.walletValue}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {homeLoanConversation.result.walletNote}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="h-12" asChild>
                    <Link href={ROUTES.CONTACT}>
                      Talk To Us
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 bg-transparent" onClick={restart}>
                    Start again
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </SectionReveal>
  );
}
