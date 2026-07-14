"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UgjGuidanceCard } from "@/components/catalyst-one/universal-guided-journey/ugj-guidance-card";
import { UgjProgressBar } from "@/components/catalyst-one/universal-guided-journey/ugj-progress-bar";
import type { UgjJourneyDefinition, UgjProgress } from "@/types/universal-guided-journey";
import { cn } from "@/lib/utils";

export interface UgjShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journey: UgjJourneyDefinition;
  progress: UgjProgress;
  greeting: string;
  animKey: number;
  error?: string | null;
  busy?: boolean;
  onBack?: () => void;
  footerActions: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * CF-CHANAKYA-008 — Universal Guided Journey conversational shell.
 * One question · CHANAKYA card · progress · one primary action in footer.
 */
export function UgjShell({
  open,
  onOpenChange,
  journey,
  progress,
  greeting,
  animKey,
  error,
  busy,
  onBack,
  footerActions,
  children,
  className,
}: UgjShellProps) {
  const step = progress.currentStep;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] w-[min(720px,94vw)] max-w-[720px] flex-col gap-0 overflow-hidden border-border/70 p-0 sm:rounded-3xl",
          className,
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/20">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-500/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sky-200/25 blur-3xl dark:bg-sky-500/10" />

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-3 pt-5">
              <div className="pr-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700/80 dark:text-teal-300/80">
                  {journey.eyebrow}
                </p>
                <DialogTitle className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
                  {journey.name}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {journey.tagline}
                </DialogDescription>
              </div>

              <UgjProgressBar progress={progress} stepCount={journey.steps.length} />

              <UgjGuidanceCard greeting={greeting} step={step} />

              <div
                key={animKey}
                className="min-h-[180px] animate-in fade-in-0 slide-in-from-right-2 duration-300"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {step.question}
                    </h3>
                    {step.optional && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Optional — you can skip this step.
                      </p>
                    )}
                  </div>
                  {children}
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-white/95 px-6 py-2.5 backdrop-blur dark:bg-zinc-950/95">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 rounded-lg"
                disabled={progress.isFirst || busy}
                onClick={onBack}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
              <div className="flex flex-wrap gap-2">{footerActions}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
