"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Compass, Sparkles } from "lucide-react";
import { ContextWorkspaceShell } from "@/components/catalyst-one/action-center/context-workspace-shell";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CHANAKYA_GUIDE_TOUR_STEPS,
  loadChanakyaTourState,
  resolveChanakyaGuideCards,
  resolveChanakyaGuidePage,
  saveChanakyaTourState,
  shouldOfferFirstTimeTour,
} from "@/lib/chanakya-guide";
import type { ChanakyaGuideContext, ChanakyaTourState } from "@/types/chanakya-guide";
import { cn } from "@/lib/utils";

/** Permanent header control — always available, never first-login only. */
export function ChanakyaGuideButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn(
        "h-7 gap-1.5 border-violet-500/35 bg-violet-500/5 px-2.5 text-[11px] font-semibold text-violet-900 hover:bg-violet-500/10 hover:text-violet-950 dark:text-violet-100 dark:hover:text-violet-50",
        className,
      )}
      onClick={onClick}
    >
      <Compass className="h-3.5 w-3.5" />
      Chanakya Guide
    </Button>
  );
}

function GuideCard({
  title,
  purpose,
  businessValue,
  recommendedNextStep,
  learnMore,
}: {
  title: string;
  purpose: string;
  businessValue: string;
  recommendedNextStep: string;
  learnMore: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-xl border border-border/70 bg-card/80 p-3.5 shadow-sm">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <dl className="mt-2.5 space-y-2 text-xs leading-relaxed">
        <div>
          <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Purpose
          </dt>
          <dd className="mt-0.5 text-foreground/90">{purpose}</dd>
        </div>
        <div>
          <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Business value
          </dt>
          <dd className="mt-0.5 text-foreground/90">{businessValue}</dd>
        </div>
        <div>
          <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
            Recommended next step
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">{recommendedNextStep}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-800 hover:underline dark:text-violet-200"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Learn More
      </button>
      {open ? (
        <p className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-2.5 py-2 text-[11px] leading-relaxed text-foreground/85">
          {learnMore}
        </p>
      ) : null}
    </article>
  );
}

function ChanakyaGuidePanel({
  open,
  onOpenChange,
  context,
  onOpenTour,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ChanakyaGuideContext;
  onOpenTour: () => void;
}) {
  const page = useMemo(() => resolveChanakyaGuidePage(context), [context]);
  const cards = useMemo(() => resolveChanakyaGuideCards(context), [context]);

  return (
    <ContextWorkspaceShell
      open={open}
      onOpenChange={onOpenChange}
      title="Chanakya Guide"
      description={page?.pagePurpose}
      entityLabel={context.transactionLabel ?? page?.workspaceLabel}
      className="sm:max-w-md md:max-w-lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 flex-1 gap-1.5 text-xs"
            onClick={onOpenTour}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Restart guided tour
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 flex-1 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close guide
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent px-3 py-3">
          <ChanakyaAvatar size="sm" animate />
          <div className="min-w-0">
            <ChanakyaIdentityLabel surface="advisory" />
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {page?.workspaceLabel ?? "Workspace"} guidance
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Short mentor guidance for this screen — not technical help. Skip anytime; your work stays
              underneath.
            </p>
          </div>
        </div>

        {cards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
            Guidance for this workspace is not configured yet. Enterprise certification requires Chanakya
            Guide content before this page is complete.
          </p>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <GuideCard key={card.id} {...card} />
            ))}
          </div>
        )}
      </div>
    </ContextWorkspaceShell>
  );
}

function ChanakyaTourDialog({
  open,
  onOpenChange,
  tour,
  onTourChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: ChanakyaTourState;
  onTourChange: (next: ChanakyaTourState) => void;
}) {
  const step = CHANAKYA_GUIDE_TOUR_STEPS[tour.stepIndex] ?? CHANAKYA_GUIDE_TOUR_STEPS[0]!;
  const isLast = tour.stepIndex >= CHANAKYA_GUIDE_TOUR_STEPS.length - 1;

  const persist = (patch: Partial<ChanakyaTourState>) => {
    onTourChange(saveChanakyaTourState(patch));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 border-b border-border/60 bg-gradient-to-r from-violet-500/10 to-transparent px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-700 dark:text-violet-300" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-800 dark:text-violet-200">
              Chanakya Guide · Tour
            </p>
          </div>
          <DialogTitle className="text-lg">{step.title}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Step {tour.stepIndex + 1} of {CHANAKYA_GUIDE_TOUR_STEPS.length}
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-foreground/90">{step.body}</p>
          <div className="mt-4 flex gap-1">
            {CHANAKYA_GUIDE_TOUR_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= tour.stepIndex ? "bg-violet-600" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 border-t border-border/60 bg-muted/20 px-5 py-3 sm:flex-col sm:space-x-0">
          <div className="flex w-full flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                persist({ status: "skipped" });
                onOpenChange(false);
              }}
            >
              Skip
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                persist({ status: "paused", stepIndex: tour.stepIndex });
                onOpenChange(false);
              }}
            >
              Pause
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={tour.stepIndex <= 0}
                onClick={() =>
                  persist({
                    status: "in_progress",
                    stepIndex: Math.max(0, tour.stepIndex - 1),
                  })
                }
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  if (isLast) {
                    persist({ status: "completed", stepIndex: tour.stepIndex });
                    onOpenChange(false);
                    return;
                  }
                  persist({
                    status: "in_progress",
                    stepIndex: tour.stepIndex + 1,
                  });
                }}
              >
                {isLast ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
          <p className="w-full text-center text-[10px] text-muted-foreground">
            Resume anytime from Chanakya Guide. Never blocks your work.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Chanakya Guide Phase 1 — button + on-demand Context Workspace + optional first-time tour.
 */
export function ChanakyaGuide({
  context,
  className,
  offerTour = true,
}: {
  context: ChanakyaGuideContext;
  className?: string;
  /** Offer first-time / paused tour after mount. */
  offerTour?: boolean;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [tour, setTour] = useState<ChanakyaTourState>(() => getDefaultClientTour());

  useEffect(() => {
    const state = loadChanakyaTourState();
    setTour(state);
    if (!offerTour) return;
    if (shouldOfferFirstTimeTour(state) && state.status === "not_started") {
      const t = window.setTimeout(() => setTourOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, [offerTour]);

  const openTour = (restart = false) => {
    const next = saveChanakyaTourState(
      restart
        ? { status: "in_progress", stepIndex: 0 }
        : { status: "in_progress", stepIndex: tour.stepIndex },
    );
    setTour(next);
    setGuideOpen(false);
    setTourOpen(true);
  };

  return (
    <>
      <ChanakyaGuideButton className={className} onClick={() => setGuideOpen(true)} />
      <ChanakyaGuidePanel
        open={guideOpen}
        onOpenChange={setGuideOpen}
        context={context}
        onOpenTour={() => openTour(true)}
      />
      <ChanakyaTourDialog
        open={tourOpen}
        onOpenChange={setTourOpen}
        tour={tour}
        onTourChange={setTour}
      />
    </>
  );
}

function getDefaultClientTour(): ChanakyaTourState {
  return {
    status: "not_started",
    stepIndex: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

export { ChanakyaGuidePanel, ChanakyaTourDialog };
