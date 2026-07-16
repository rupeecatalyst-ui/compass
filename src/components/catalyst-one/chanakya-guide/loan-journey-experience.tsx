"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
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
  {
    band: string;
    heading: string;
    desc: string;
    node: string;
    nodeCurrent: string;
    connector: string;
    glow: string;
  }
> = {
  blue: {
    band: "border-blue-500/25 bg-blue-500/[0.07]",
    heading: "text-blue-800 dark:text-blue-200",
    desc: "text-blue-900/70 dark:text-blue-100/70",
    node: "border-blue-400/40 bg-blue-500/10 text-blue-800 dark:text-blue-100",
    nodeCurrent:
      "border-blue-400 bg-blue-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.45)]",
    connector: "from-blue-400/20 via-blue-500/70 to-blue-400/20",
    glow: "bg-blue-400/30",
  },
  purple: {
    band: "border-violet-500/25 bg-violet-500/[0.07]",
    heading: "text-violet-800 dark:text-violet-200",
    desc: "text-violet-900/70 dark:text-violet-100/70",
    node: "border-violet-400/40 bg-violet-500/10 text-violet-800 dark:text-violet-100",
    nodeCurrent:
      "border-violet-400 bg-violet-600 text-white shadow-[0_0_24px_rgba(139,92,246,0.45)]",
    connector: "from-violet-400/20 via-violet-500/70 to-violet-400/20",
    glow: "bg-violet-400/30",
  },
  green: {
    band: "border-emerald-500/25 bg-emerald-500/[0.07]",
    heading: "text-emerald-800 dark:text-emerald-200",
    desc: "text-emerald-900/70 dark:text-emerald-100/70",
    node: "border-emerald-400/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100",
    nodeCurrent:
      "border-emerald-400 bg-emerald-600 text-white shadow-[0_0_24px_rgba(16,185,129,0.45)]",
    connector: "from-emerald-400/20 via-emerald-500/70 to-emerald-400/20",
    glow: "bg-emerald-400/30",
  },
  orange: {
    band: "border-orange-500/25 bg-orange-500/[0.07]",
    heading: "text-orange-800 dark:text-orange-200",
    desc: "text-orange-900/70 dark:text-orange-100/70",
    node: "border-orange-400/40 bg-orange-500/10 text-orange-800 dark:text-orange-100",
    nodeCurrent:
      "border-orange-400 bg-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.45)]",
    connector: "from-orange-400/20 via-orange-500/70 to-orange-400/20",
    glow: "bg-orange-400/30",
  },
};

/**
 * Certified Chanakya Guide — full-width Enterprise Loan Journey map.
 * Layout and stage order are frozen for Enterprise Certification.
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
  const [transitionKey, setTransitionKey] = useState(0);

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
    setTransitionKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      {/* Chanakya mentor + YOU ARE HERE */}
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(240px,300px)] lg:items-start">
        <div className="flex flex-col items-center gap-2 lg:items-start">
          <div className="relative">
            <span
              aria-hidden
              className="absolute -inset-3 animate-pulse rounded-full bg-violet-500/20 blur-md"
            />
            <span
              aria-hidden
              className="absolute -inset-1 animate-[pulse_3.5s_ease-in-out_infinite] rounded-full border border-violet-400/40"
            />
            <ChanakyaAvatar
              size="xl"
              animate
              priority
              className="!h-[132px] !w-[132px] border-2 border-violet-400/50 shadow-[0_0_28px_rgba(139,92,246,0.35)]"
            />
          </div>
          <ChanakyaIdentityLabel surface="advisory" className="text-center lg:text-left" />
        </div>

        <div
          key={`msg-${transitionKey}`}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-background to-transparent p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-800 dark:text-violet-200">
            Chanakya · Mentor
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/95">
            {current.chanakyaMessage}
          </p>
        </div>

        <div
          key={`here-${transitionKey}`}
          className="animate-in fade-in-0 duration-300 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            You are here
          </p>
          <p className={cn("mt-1.5 text-sm font-semibold", PHASE_TONE[phase.tone].heading)}>
            {phase.label}
          </p>
          <dl className="mt-3 space-y-2 text-xs">
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Current
              </dt>
              <dd className="mt-0.5 font-semibold text-foreground">{current.name}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Next
              </dt>
              <dd className="mt-0.5 font-medium text-foreground/90">
                {next?.name ?? "Journey complete"}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                Objective
              </dt>
              <dd className="mt-0.5 leading-relaxed text-foreground/90">{current.objective}</dd>
            </div>
            {next ? (
              <div>
                <dt className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Next objective
                </dt>
                <dd className="mt-0.5 leading-relaxed text-foreground/80">{next.objective}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {/* Position strip */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-[11px]">
        {stages.map((s, i) => {
          const done = i < transactionIndex;
          const isCurrent = i === transactionIndex;
          const isNext = i === transactionIndex + 1;
          return (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              {i > 0 ? <span className="text-muted-foreground/50">·</span> : null}
              {done ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  {s.name}
                </span>
              ) : isCurrent ? (
                <span className="font-semibold text-foreground">● {s.name} (Current)</span>
              ) : isNext ? (
                <span className="font-medium text-teal-800 dark:text-teal-200">
                  → {s.name} (Next)
                </span>
              ) : (
                <span className="text-muted-foreground/70">{s.name}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Full-width journey by phase */}
      <div className="space-y-4">
        {CHANAKYA_LOAN_JOURNEY_PHASES.map((p) => {
          const phaseStages = stages.filter((s) => s.phaseId === p.id);
          const tone = PHASE_TONE[p.tone];
          return (
            <section
              key={p.id}
              className={cn("rounded-2xl border px-3 py-3 sm:px-4 sm:py-4", tone.band)}
            >
              <div className="mb-3">
                <h3
                  className={cn(
                    "text-sm font-semibold tracking-tight sm:text-base",
                    tone.heading,
                  )}
                >
                  {p.label}
                </h3>
                <p className={cn("mt-0.5 text-[11px] leading-relaxed sm:text-xs", tone.desc)}>
                  {p.description}
                </p>
              </div>

              <div className="flex w-full items-stretch gap-0 overflow-x-auto pb-1 scrollbar-thin">
                {phaseStages.map((stage, idx) => {
                  const globalIndex = stages.findIndex((s) => s.id === stage.id);
                  return (
                    <JourneyStageNode
                      key={stage.id}
                      stage={stage}
                      tone={tone}
                      phaseTone={p.tone}
                      isFirst={idx === 0}
                      isLast={idx === phaseStages.length - 1}
                      status={
                        globalIndex < transactionIndex
                          ? "completed"
                          : globalIndex === transactionIndex
                            ? "current"
                            : globalIndex === focusIndex
                              ? "focused"
                              : "future"
                      }
                      isFocus={globalIndex === focusIndex}
                      onSelect={() => goTo(globalIndex)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Prev / Next */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 text-xs"
          disabled={!previous}
          onClick={() => goTo(focusIndex - 1)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Exploring stage {focusIndex + 1} of {stages.length} · Transaction at{" "}
          {stages[transactionIndex]?.name}
        </p>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          disabled={!next && focusIndex >= stages.length - 1}
          onClick={() => goTo(focusIndex + 1)}
        >
          Next
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function JourneyStageNode({
  stage,
  tone,
  isFirst,
  isLast,
  status,
  isFocus,
  onSelect,
}: {
  stage: ChanakyaLoanJourneyStageDef;
  tone: (typeof PHASE_TONE)[ChanakyaLoanJourneyPhaseDef["tone"]];
  phaseTone: ChanakyaLoanJourneyPhaseDef["tone"];
  isFirst: boolean;
  isLast: boolean;
  status: "completed" | "current" | "focused" | "future";
  isFocus: boolean;
  onSelect: () => void;
}) {
  const Icon = STAGE_ICONS[stage.id] ?? BookOpen;
  const isCurrent = status === "current";
  const isCompleted = status === "completed";
  const isFuture = status === "future";

  return (
    <div
      className={cn(
        "relative flex min-w-[140px] flex-1 flex-col items-center px-1 sm:min-w-[160px]",
        isFuture && !isFocus && "opacity-55",
      )}
    >
      {!isFirst ? (
        <div
          aria-hidden
          className={cn(
            "absolute left-0 top-[2.15rem] h-[2px] w-1/2 -translate-x-0 bg-gradient-to-r",
            tone.connector,
            "animate-[pulse_2.8s_ease-in-out_infinite]",
          )}
        />
      ) : null}
      {!isLast ? (
        <div
          aria-hidden
          className={cn(
            "absolute right-0 top-[2.15rem] h-[2px] w-1/2 bg-gradient-to-r",
            tone.connector,
            "animate-[pulse_2.8s_ease-in-out_infinite]",
          )}
        />
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "group relative z-[1] flex flex-col items-center rounded-2xl px-2 py-2 text-center transition-all duration-300",
          "hover:-translate-y-0.5 hover:bg-background/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isFocus && "bg-background/50",
        )}
      >
        <span
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-16 sm:w-16",
            isCurrent || (isFocus && !isCompleted)
              ? tone.nodeCurrent
              : isCompleted
                ? cn(tone.node, "ring-2 ring-emerald-400/40")
                : tone.node,
            isCurrent && "animate-[pulse_2.2s_ease-in-out_infinite]",
            isCompleted && "shadow-[0_0_16px_rgba(16,185,129,0.25)]",
            status === "focused" && !isCurrent && "ring-2 ring-teal-400/50",
          )}
        >
          {(isCurrent || isCompleted) && (
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full blur-md",
                isCompleted ? "bg-emerald-400/25" : tone.glow,
              )}
            />
          )}
          <Icon className="relative h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <span className="mt-2 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {stage.order}
        </span>
        <span className="mt-0.5 text-xs font-semibold tracking-tight text-foreground sm:text-sm">
          {stage.name}
        </span>
        <span className="mt-1 line-clamp-2 max-w-[11rem] text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
          {stage.objective}
        </span>
      </button>
    </div>
  );
}
