"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HlBody, HlChapter, HlEyebrow, HlGlassCard, HlHeadline } from "@/components/home-loan-experience/hl-chapter";
import { homeLoanExperience } from "@/config/home-loan-experience";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

function FitnessGauge({ score, label }: { score: number; label: string }) {
  const reduceMotion = useReducedMotion();
  const rotation = -90 + (score / 100) * 180;

  return (
    <div className="relative mx-auto flex flex-col items-center">
      <div className="relative h-44 w-44 sm:h-52 sm:w-52">
        <svg viewBox="0 0 200 120" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="gauge_grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(45,212,191,0.3)" />
              <stop offset="100%" stopColor="rgb(45,212,191)" />
            </linearGradient>
          </defs>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gauge_grad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="251"
            initial={{ strokeDashoffset: 251 }}
            animate={{ strokeDashoffset: 251 - (score / 100) * 251 }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: smoothEase }}
          />
        </svg>
        <motion.div
          className="absolute left-1/2 top-[58%] h-[52%] w-[2px] origin-bottom -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--glow)]"
          animate={{ rotate: rotation }}
          transition={{ duration: reduceMotion ? 0 : 0.85, ease: smoothEase }}
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-2 text-center">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">{score}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function HlFitnessDiscovery() {
  const { fitness } = homeLoanExperience;
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const reduceMotion = useReducedMotion();

  const currentQuestion = fitness.questions[step];
  const isComplete = step >= fitness.questions.length;

  const score = useMemo(() => {
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [scores]);

  const gaugeLabel =
    score >= 75 ? fitness.gaugeLabels.high : score >= 55 ? fitness.gaugeLabels.mid : fitness.gaugeLabels.low;

  const handleAnswer = (optionScore: number) => {
    const nextScores = [...scores, optionScore];
    setScores(nextScores);
    setStep((s) => s + 1);
  };

  return (
    <HlChapter id="fitness-discovery" dark className="border-t border-white/[0.04]">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
        <div>
          <HlEyebrow>{fitness.eyebrow}</HlEyebrow>
          <HlHeadline>{fitness.headline}</HlHeadline>
          <HlBody className="mt-4 max-w-md">{fitness.subheadline}</HlBody>
        </div>

        <HlGlassCard glow={isComplete && score >= 70} className="min-h-[320px]">
          <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
            <FitnessGauge score={score} label={gaugeLabel} />

            <div className="min-h-[200px]">
              <AnimatePresence mode="wait">
                {!isComplete && currentQuestion ? (
                  <motion.div
                    key={currentQuestion.id}
                    initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                    transition={{ duration: 0.4, ease: smoothEase }}
                    className="space-y-4"
                  >
                    <p className="text-xs text-muted-foreground">
                      {step + 1} of {fitness.questions.length}
                    </p>
                    <p className="text-lg font-medium leading-snug text-foreground">{currentQuestion.prompt}</p>
                    <div className="space-y-2">
                      {currentQuestion.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAnswer(opt.score)}
                          className={cn(
                            "w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-left text-sm transition-all duration-300",
                            "hover:border-primary/30 hover:bg-primary/[0.06]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="complete"
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: smoothEase }}
                    className="space-y-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Progress made</p>
                    <p className="text-lg font-medium text-foreground">
                      You&apos;re building a clearer picture. That&apos;s the first step to confidence.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Continue below to see what becomes possible with your numbers.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </HlGlassCard>
      </div>
    </HlChapter>
  );
}
