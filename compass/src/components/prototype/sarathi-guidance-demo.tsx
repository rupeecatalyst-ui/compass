"use client";

import { motion } from "framer-motion";
import { LivingCompass } from "@/components/living-compass";
import { ProgressNarrative, useProgressNarrative } from "@/components/progress-narrative";
import {
  PROGRESS_NARRATIVE_DEMO_FLOWS,
  PROGRESS_NARRATIVE_FLOWS,
  type ProgressNarrativeFlowId,
} from "@/config/progress-narrative";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * SARATHI guidance prototype — Living Compass + Progress Narrative.
 * The narrative is the primary interaction; the compass is a subtle visual guide.
 */
export function SarathiGuidanceDemo() {
  const {
    flowId,
    steps,
    headline,
    activeMessage,
    isComplete,
    isRunning,
    compassState,
    direction,
    start,
    reset,
  } = useProgressNarrative();

  const handleFlowSelect = (id: ProgressNarrativeFlowId) => {
    if (isRunning) return;
    start(id);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#05070c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(45,212,191,0.1),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-30" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-14 sm:px-8 sm:py-18">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Prototype</p>
        <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          SARATHI Guidance
        </h1>
        <p className="mt-3 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
          Progress Narrative with Living Compass — prototype only, not production.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: smoothEase }}
          className="mt-12 flex w-full flex-col items-center"
        >
          {/* Living Compass — unchanged component, subtle guide */}
          <div className="relative flex h-40 w-40 items-center justify-center rounded-[1.75rem] border border-white/8 bg-white/[0.02] shadow-[inset_0_0_48px_rgba(45,212,191,0.04)] sm:h-44 sm:w-44">
            <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-[radial-gradient(circle_at_50%_40%,rgba(45,212,191,0.08),transparent_65%)]" />
            <LivingCompass
              state={flowId ? compassState : "idle"}
              direction={isComplete ? direction : undefined}
              size={64}
            />
          </div>

          {/* Progress Narrative — primary interaction */}
          <div className="mt-10 w-full">
            {flowId ? (
              <ProgressNarrative
                headline={headline}
                activeMessage={activeMessage}
                steps={steps}
                isComplete={isComplete}
              />
            ) : (
              <div className="mx-auto max-w-md rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-10 text-center">
                <p className="text-lg font-medium text-foreground">Ready when you are</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose a journey below. SARATHI will guide you step by step — you will always know
                  what is happening.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <div className="mt-12 w-full">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Choose a journey
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {PROGRESS_NARRATIVE_DEMO_FLOWS.map((id) => {
              const flow = PROGRESS_NARRATIVE_FLOWS[id];
              const isActive = flowId === id;
              return (
                <Button
                  key={id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  disabled={isRunning && !isActive}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--glow)]"
                      : "border-white/10 bg-white/[0.02] text-foreground hover:border-primary/25 hover:bg-primary/5",
                  )}
                  onClick={() => handleFlowSelect(id)}
                >
                  {flow.title}
                </Button>
              );
            })}
          </div>

          {flowId && (isComplete || !isRunning) ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={reset}
              >
                Start over
              </Button>
            </div>
          ) : null}

          <p className="mt-4 text-center text-xs text-muted-foreground/70">
            Steps advance every 2–3 seconds. The compass stays alive throughout.
          </p>
        </div>

        <p className="mt-12 max-w-lg text-center text-xs text-muted-foreground/80">
          No AI, backend, or recommendation engine. Narratives are configuration-driven in{" "}
          <code className="text-primary/70">progress-narrative.ts</code>.
        </p>
      </div>
    </div>
  );
}
