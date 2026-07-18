"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Contact,
  FileCheck2,
  FileStack,
  Flag,
  FolderOpen,
  Landmark,
  ListTodo,
  Scale,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { Button } from "@/components/ui/button";
import {
  getChanakyaLoanJourneyProgress,
  resolveChanakyaLoanJourneyStageIndex,
} from "@/lib/chanakya-guide";
import { CHANAKYA_LOAN_JOURNEY_PHASES } from "@/constants/chanakya-guide";
import type {
  ChanakyaGuideContext,
  ChanakyaLoanJourneyPhaseDef,
  ChanakyaLoanJourneyStageDef,
  ChanakyaLoanJourneyStageId,
} from "@/types/chanakya-guide";
import { cn } from "@/lib/utils";

const STAGE_ICONS: Record<ChanakyaLoanJourneyStageId, LucideIcon> = {
  contact: Contact,
  opportunity_workspace: Target,
  strategic_workspace: Sparkles,
  document_center: FolderOpen,
  credit_workbench: FileStack,
  loan_workspace: Landmark,
  lender_pipeline: Building2,
  tasks: ListTodo,
  timeline: ClipboardList,
  approval: FileCheck2,
  disbursement: Flag,
  accounting: Calculator,
  closure: Scale,
};

const PHASE_TONE: Record<
  ChanakyaLoanJourneyPhaseDef["tone"],
  { band: string; heading: string; node: string; nodeCurrent: string }
> = {
  blue: {
    band: "border-blue-500/20 bg-blue-500/[0.06]",
    heading: "text-blue-800 dark:text-blue-200",
    node: "border-blue-400/40 bg-blue-500/10 text-blue-800 dark:text-blue-100",
    nodeCurrent: "border-blue-400 bg-blue-500 text-white",
  },
  purple: {
    band: "border-violet-500/20 bg-violet-500/[0.06]",
    heading: "text-violet-800 dark:text-violet-200",
    node: "border-violet-400/40 bg-violet-500/10 text-violet-800 dark:text-violet-100",
    nodeCurrent: "border-violet-400 bg-violet-600 text-white",
  },
  green: {
    band: "border-emerald-500/20 bg-emerald-500/[0.06]",
    heading: "text-emerald-800 dark:text-emerald-200",
    node: "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100",
    nodeCurrent: "border-emerald-400 bg-emerald-600 text-white",
  },
  orange: {
    band: "border-orange-500/20 bg-orange-500/[0.06]",
    heading: "text-orange-800 dark:text-orange-200",
    node: "border-orange-400/40 bg-orange-500/10 text-orange-800 dark:text-orange-100",
    nodeCurrent: "border-orange-400 bg-orange-500 text-white",
  },
};

function InfoCard({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        emphasize
          ? "border-teal-500/30 bg-teal-500/[0.07]"
          : "border-border/70 bg-card",
      )}
    >
      <p
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.12em]",
          emphasize ? "text-teal-700 dark:text-teal-300" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-[12px] leading-snug text-foreground",
          emphasize ? "font-semibold" : "font-medium",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * CHANAKYA drawer journey surface — presentation-only refinement (CO-SPRINT-097).
 * Stage resolution, navigation, and guidance strings are unchanged.
 */
export function ChanakyaLoanJourneyExperience({
  context,
}: {
  context: ChanakyaGuideContext;
}) {
  const detectedIndex = useMemo(
    () => resolveChanakyaLoanJourneyStageIndex(context),
    [context],
  );
  const [focusIndex, setFocusIndex] = useState(detectedIndex);
  const [journeyOpen, setJourneyOpen] = useState(false);

  useEffect(() => {
    setFocusIndex(detectedIndex);
  }, [detectedIndex]);

  const progress = useMemo(
    () => getChanakyaLoanJourneyProgress(focusIndex),
    [focusIndex],
  );
  const { stages, current, next, previous, phase } = progress;
  const transactionIndex = detectedIndex;

  const goTo = (index: number) => {
    if (index < 0 || index >= stages.length) return;
    setFocusIndex(index);
  };

  return (
    <div className="space-y-3">
      {/* Compact identity row */}
      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2">
        <ChanakyaAvatar size="sm" animate={false} priority className="!h-10 !w-10 shadow-sm" />
        <div className="min-w-0 flex-1">
          <ChanakyaIdentityLabel surface="advisory" />
          <p className="truncate text-[12px] font-semibold text-foreground">
            {phase.label} · Stage {focusIndex + 1}/{stages.length}
          </p>
        </div>
      </div>

      {/* Executive info cards — scannable, no paragraphs */}
      <div className="grid grid-cols-1 gap-1.5">
        <InfoCard label="Current Workspace" value={current.name} />
        <InfoCard label="Current Objective" value={current.objective} />
        <InfoCard label="Next Step" value={next?.name ?? "Journey complete"} />
        <InfoCard label="Today's Focus" value={current.chanakyaMessage} />
        <InfoCard
          label="Recommended Action"
          value={next?.objective ?? "Review closure and confirm obligations are complete."}
          emphasize
        />
      </div>

      {/* Compact position strip */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[10px]">
        {stages.map((s, i) => {
          const done = i < transactionIndex;
          const isCurrent = i === transactionIndex;
          const isNext = i === transactionIndex + 1;
          return (
            <span key={s.id} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-muted-foreground/40">·</span> : null}
              {done ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {s.name}
                </span>
              ) : isCurrent ? (
                <span className="font-semibold text-foreground">{s.name}</span>
              ) : isNext ? (
                <span className="text-teal-800 dark:text-teal-200">→ {s.name}</span>
              ) : (
                <span className="text-muted-foreground/60">{s.name}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Journey map — collapsed by default to minimize scroll */}
      <div className="rounded-lg border border-border/70">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
          onClick={() => setJourneyOpen((v) => !v)}
          aria-expanded={journeyOpen}
        >
          <span className="text-[11px] font-semibold text-foreground">Journey map</span>
          {journeyOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {journeyOpen ? (
          <div className="space-y-2 border-t border-border/60 px-2 pb-2.5 pt-2">
            {CHANAKYA_LOAN_JOURNEY_PHASES.map((p) => {
              const phaseStages = stages.filter((s) => s.phaseId === p.id);
              const tone = PHASE_TONE[p.tone];
              return (
                <section key={p.id} className={cn("rounded-md border px-2 py-1.5", tone.band)}>
                  <p className={cn("text-[10px] font-semibold", tone.heading)}>{p.label}</p>
                  <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5">
                    {phaseStages.map((stage) => {
                      const globalIndex = stages.findIndex((s) => s.id === stage.id);
                      const Icon = STAGE_ICONS[stage.id] ?? BookOpen;
                      const isCurrent = globalIndex === transactionIndex;
                      const isCompleted = globalIndex < transactionIndex;
                      const isFocus = globalIndex === focusIndex;
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => goTo(globalIndex)}
                          className={cn(
                            "flex min-w-[72px] flex-col items-center rounded-md px-1 py-1 transition-colors",
                            isFocus && "bg-background/70",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full border",
                              isCurrent || (isFocus && !isCompleted)
                                ? tone.nodeCurrent
                                : tone.node,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="mt-1 max-w-[68px] truncate text-[9px] font-medium text-foreground">
                            {stage.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={!previous}
          onClick={() => goTo(focusIndex - 1)}
        >
          <ArrowLeft className="h-3 w-3" />
          Previous
        </Button>
        <p className="text-[10px] tabular-nums text-muted-foreground">
          {focusIndex + 1}/{stages.length}
        </p>
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={!next && focusIndex >= stages.length - 1}
          onClick={() => goTo(focusIndex + 1)}
        >
          Next
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
