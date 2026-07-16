"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Compass, Sparkles } from "lucide-react";
import { ContextWorkspaceShell } from "@/components/catalyst-one/action-center/context-workspace-shell";
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
  resolveChanakyaGuideEntries,
  resolveChanakyaGuideWorkspaceMeta,
  saveChanakyaTourState,
  shouldOfferFirstTimeTour,
} from "@/lib/chanakya-guide";
import type {
  ChanakyaGuideContext,
  ChanakyaGuideEntry,
  ChanakyaTourState,
} from "@/types/chanakya-guide";
import { cn } from "@/lib/utils";
import { ChanakyaLoanJourneyExperience } from "./loan-journey-experience";

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

function Field({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <dt
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.14em]",
          emphasize ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-foreground/90",
          emphasize && "font-medium text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Renders one Enterprise Guide Repository entry — no invented copy. */
function GuideEntryCard({ entry }: { entry: ChanakyaGuideEntry }) {
  const [open, setOpen] = useState(false);
  const related = [
    entry.relatedWorkflow ? { label: "Related workflow", value: entry.relatedWorkflow } : null,
    entry.relatedRegistry ? { label: "Related registry", value: entry.relatedRegistry } : null,
    entry.relatedEnterpriseEngine
      ? { label: "Related enterprise engine", value: entry.relatedEnterpriseEngine }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <article className="rounded-xl border border-border/70 bg-card/80 p-3.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {entry.guidanceTitle}
        </h3>
        <span className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {entry.section}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-foreground/95">{entry.mentorMessage}</p>
      <dl className="mt-2.5 space-y-2 text-xs leading-relaxed">
        <Field label="Best practice" value={entry.bestPractice} />
        <Field label="Recommended next step" value={entry.recommendedNextStep} emphasize />
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
        <div className="mt-2 space-y-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-2.5 py-2 text-[11px] leading-relaxed text-foreground/85">
          <p>{entry.detailedGuidance}</p>
          {related.length > 0 ? (
            <dl className="space-y-1.5 border-t border-violet-500/15 pt-2">
              {related.map((r) => (
                <div key={r.label}>
                  <dt className="text-[9px] font-semibold uppercase tracking-wide text-violet-800/80 dark:text-violet-200/80">
                    {r.label}
                  </dt>
                  <dd className="text-foreground/80">{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function normalizeGuideContext(context: ChanakyaGuideContext): ChanakyaGuideContext {
  return {
    ...context,
    platform: context.platform ?? "catalyst_one",
    section: context.section ?? context.moduleId,
  };
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
  const resolvedContext = useMemo(() => normalizeGuideContext(context), [context]);
  const meta = useMemo(
    () => resolveChanakyaGuideWorkspaceMeta(resolvedContext),
    [resolvedContext],
  );
  const entries = useMemo(
    () => resolveChanakyaGuideEntries(resolvedContext),
    [resolvedContext],
  );
  const [tipsOpen, setTipsOpen] = useState(false);

  return (
    <ContextWorkspaceShell
      open={open}
      onOpenChange={onOpenChange}
      title="Chanakya Guide"
      description="Enterprise Loan Journey — understand where you are and what comes next."
      entityLabel={context.transactionLabel ?? meta?.workspaceLabel}
      className="w-[min(96vw,1280px)] sm:max-w-[min(96vw,1280px)] md:max-w-[min(96vw,1280px)]"
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
      <div className="space-y-6">
        <ChanakyaLoanJourneyExperience context={resolvedContext} />

        {entries.length > 0 ? (
          <div className="border-t border-border/50 pt-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-800 hover:underline dark:text-violet-200"
              onClick={() => setTipsOpen((v) => !v)}
              aria-expanded={tipsOpen}
            >
              {tipsOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Workspace tips from Guide Repository
            </button>
            {tipsOpen ? (
              <div className="mt-3 space-y-3">
                {entries.map((entry) => (
                  <GuideEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
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
 * Chanakya Guide Phase 1 — button + Context Workspace rendering Guide Repository entries.
 */
export function ChanakyaGuide({
  context,
  className,
  offerTour = true,
}: {
  context: ChanakyaGuideContext;
  className?: string;
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
