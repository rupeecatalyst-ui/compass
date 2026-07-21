"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Calculator,
  Check,
  Contact,
  FileCheck2,
  FileStack,
  Flag,
  FolderOpen,
  Landmark,
  Scale,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  CHANAKYA_LOAN_JOURNEY_PHASES,
} from "@/constants/chanakya-guide";
import { buildNavigatorStageHref } from "@/constants/enterprise-business-journey-navigator";
import {
  getChanakyaLoanJourneyPhase,
  listChanakyaLoanJourneyStages,
} from "@/lib/chanakya-guide";
import type {
  ChanakyaLoanJourneyPhaseDef,
  ChanakyaLoanJourneyStageId,
} from "@/types/chanakya-guide";
import { cn } from "@/lib/utils";

const STAGE_ICONS: Partial<Record<ChanakyaLoanJourneyStageId, LucideIcon>> = {
  contact: Contact,
  opportunity_workspace: Target,
  strategic_workspace: Sparkles,
  document_center: FolderOpen,
  credit_workbench: FileStack,
  loan_workspace: Landmark,
  lender_pipeline: Building2,
  approval: FileCheck2,
  disbursement: Flag,
  accounting: Calculator,
  closure: Scale,
};

const PHASE_TONE: Record<
  ChanakyaLoanJourneyPhaseDef["tone"],
  {
    label: string;
    completed: string;
    current: string;
    upcoming: string;
    connector: string;
    connectorDone: string;
  }
> = {
  blue: {
    label: "text-blue-700/80 dark:text-blue-300/80",
    completed:
      "border-blue-400/50 bg-blue-500/15 text-blue-900 shadow-[0_0_14px_rgba(59,130,246,0.28)] dark:text-blue-100",
    current:
      "border-blue-400 bg-blue-600 text-white shadow-[0_0_22px_rgba(59,130,246,0.5)]",
    upcoming: "border-border/60 bg-muted/30 text-muted-foreground opacity-75",
    connector: "from-blue-400/15 via-blue-500/55 to-blue-400/15",
    connectorDone: "from-blue-400/40 via-blue-500 to-blue-400/40",
  },
  purple: {
    label: "text-violet-700/80 dark:text-violet-300/80",
    completed:
      "border-violet-400/50 bg-violet-500/15 text-violet-900 shadow-[0_0_14px_rgba(139,92,246,0.28)] dark:text-violet-100",
    current:
      "border-violet-400 bg-violet-600 text-white shadow-[0_0_22px_rgba(139,92,246,0.5)]",
    upcoming: "border-border/60 bg-muted/30 text-muted-foreground opacity-75",
    connector: "from-violet-400/15 via-violet-500/55 to-violet-400/15",
    connectorDone: "from-violet-400/40 via-violet-500 to-violet-400/40",
  },
  green: {
    label: "text-emerald-700/80 dark:text-emerald-300/80",
    completed:
      "border-emerald-400/50 bg-emerald-500/15 text-emerald-900 shadow-[0_0_14px_rgba(16,185,129,0.28)] dark:text-emerald-100",
    current:
      "border-emerald-400 bg-emerald-600 text-white shadow-[0_0_22px_rgba(16,185,129,0.5)]",
    upcoming: "border-border/60 bg-muted/30 text-muted-foreground opacity-75",
    connector: "from-emerald-400/15 via-emerald-500/55 to-emerald-400/15",
    connectorDone: "from-emerald-400/40 via-emerald-500 to-emerald-400/40",
  },
  orange: {
    label: "text-orange-700/80 dark:text-orange-300/80",
    completed:
      "border-orange-400/50 bg-orange-500/15 text-orange-900 shadow-[0_0_14px_rgba(249,115,22,0.28)] dark:text-orange-100",
    current:
      "border-orange-400 bg-orange-600 text-white shadow-[0_0_22px_rgba(249,115,22,0.5)]",
    upcoming: "border-border/60 bg-muted/30 text-muted-foreground opacity-75",
    connector: "from-orange-400/15 via-orange-500/55 to-orange-400/15",
    connectorDone: "from-orange-400/40 via-orange-500 to-orange-400/40",
  },
};

export interface BusinessJourneyNavigatorProps {
  currentStageId: ChanakyaLoanJourneyStageId;
  className?: string;
  fileId?: string | null;
  opportunityId?: string | null;
  /** When false, stage cards are indicators only. */
  enableStageNavigation?: boolean;
  /**
   * CO-SPRINT-106 — hide phase labels and “Current” helper captions.
   * Cards communicate via icon, title, and status colour only.
   */
  hideHelperCaptions?: boolean;
  /** Compact card size for Workspace Header band. */
  density?: "default" | "compact";
}

/**
 * Permanent Business Journey progress visualisation + stage navigation shortcuts.
 * Tasks / Timeline are support modules — excluded from stage progression.
 */
export function BusinessJourneyNavigator({
  currentStageId,
  className,
  fileId,
  opportunityId,
  enableStageNavigation = true,
  hideHelperCaptions = false,
  density = "default",
}: BusinessJourneyNavigatorProps) {
  const router = useRouter();
  const stages = listChanakyaLoanJourneyStages();
  const focusIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === currentStageId),
  );
  const currentRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  /**
   * Horizontal-only scroll. Never use Element.scrollIntoView inside sticky /
   * dialog / nested overflow parents — it scrolls vertical ancestors and
   * produces workspace viewport jump across all execution desks.
   */
  useEffect(() => {
    const scroller = scrollerRef.current;
    const target = currentRef.current;
    if (!scroller || !target) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const delta =
      targetRect.left +
      targetRect.width / 2 -
      (scrollerRect.left + scrollerRect.width / 2);
    const nextLeft = scroller.scrollLeft + delta;
    const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const clamped = Math.max(0, Math.min(maxLeft, nextLeft));
    if (Math.abs(scroller.scrollLeft - clamped) < 1) return;
    scroller.scrollTo({ left: clamped, behavior: "smooth" });
  }, [currentStageId]);

  const phaseBands = CHANAKYA_LOAN_JOURNEY_PHASES.map((phase) => ({
    phase,
    stages: stages.filter((s) => s.phaseId === phase.id),
  })).filter((band) => band.stages.length > 0);

  const onStageActivate = (stageId: ChanakyaLoanJourneyStageId, status: string) => {
    if (!enableStageNavigation) return;
    if (status === "upcoming") return;
    const href = buildNavigatorStageHref(stageId, { fileId, opportunityId });
    if (!href) return;
    router.push(href);
  };

  return (
    <div
      className={cn("shrink-0 bg-transparent", className)}
      role="navigation"
      aria-label="Business Journey Navigator"
    >
      <div
        ref={scrollerRef}
        className={cn(
          "overflow-x-auto scrollbar-thin sm:px-5",
          density === "compact" ? "px-3 py-1" : "px-3 py-1.5",
        )}
      >
        <div className="flex min-w-max items-stretch gap-0">
          {phaseBands.map((band, bandIdx) => {
            const tone = PHASE_TONE[band.phase.tone];
            return (
              <div key={band.phase.id} className="flex items-stretch">
                {bandIdx > 0 ? (
                  <div
                    className="mx-1.5 w-px shrink-0 self-stretch bg-border/70"
                    aria-hidden
                  />
                ) : null}
                <div className={cn("flex flex-col", hideHelperCaptions ? "gap-0" : "gap-1.5")}>
                  {!hideHelperCaptions ? (
                    <p
                      className={cn(
                        "px-1 text-[8px] font-semibold uppercase tracking-[0.14em]",
                        tone.label,
                      )}
                    >
                      {band.phase.label}
                    </p>
                  ) : null}
                  <div className="flex items-center">
                    {band.stages.map((stage, i) => {
                      const globalIdx = stages.findIndex((s) => s.id === stage.id);
                      const status =
                        globalIdx < focusIndex
                          ? "completed"
                          : globalIdx === focusIndex
                            ? "current"
                            : "upcoming";
                      const Icon = STAGE_ICONS[stage.id] ?? Target;
                      const isLastInBand = i === band.stages.length - 1;
                      const isLastOverall = globalIdx === stages.length - 1;
                      const connectorTone = PHASE_TONE[
                        getChanakyaLoanJourneyPhase(stage.phaseId).tone
                      ];
                      const href = buildNavigatorStageHref(stage.id, {
                        fileId,
                        opportunityId,
                      });
                      const clickable =
                        enableStageNavigation &&
                        status !== "upcoming" &&
                        Boolean(href);

                      return (
                        <div key={stage.id} className="flex items-center">
                          <button
                            type="button"
                            ref={status === "current" ? currentRef : undefined}
                            disabled={!clickable}
                            onClick={() => onStageActivate(stage.id, status)}
                            className={cn(
                              "enterprise-stable-surface group flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5",
                              "transition-colors duration-150",
                              density === "compact"
                                ? "h-[3.35rem] w-[3.6rem] py-1 sm:h-[3.5rem] sm:w-[3.85rem]"
                                : "h-[4.75rem] w-[4.75rem] justify-start py-1.5 sm:h-[5rem] sm:w-[5.25rem]",
                              status === "completed" && tone.completed,
                              status === "current" && cn(tone.current, "bjn-pulse"),
                              status === "upcoming" && tone.upcoming,
                              clickable &&
                                "cursor-pointer hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              !clickable && "cursor-default",
                            )}
                            aria-current={status === "current" ? "step" : undefined}
                            aria-label={
                              status === "current"
                                ? `${stage.name} (current)`
                                : status === "completed"
                                  ? `${stage.name} (completed)`
                                  : `${stage.name} (upcoming)`
                            }
                            title={stage.name}
                          >
                            {density === "default" ? (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-[9px] font-bold tabular-nums dark:bg-white/15">
                                {status === "completed" ? (
                                  <Check className="h-3 w-3" strokeWidth={2.5} />
                                ) : (
                                  globalIdx + 1
                                )}
                              </span>
                            ) : status === "completed" ? (
                              <Check className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.5} />
                            ) : (
                              <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                            )}
                            {density === "default" ? (
                              <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                            ) : null}
                            <span
                              className={cn(
                                "text-center font-semibold leading-tight tracking-tight",
                                density === "compact"
                                  ? "line-clamp-2 text-[8px]"
                                  : "line-clamp-2 min-h-[1.6rem] text-[9px]",
                              )}
                            >
                              {stage.name}
                            </span>
                            {!hideHelperCaptions && density === "default" ? (
                              <span
                                className={cn(
                                  "h-2.5 text-[7px] font-medium uppercase tracking-wider opacity-90",
                                  status !== "current" && "invisible",
                                )}
                              >
                                Current
                              </span>
                            ) : null}
                          </button>
                          {!isLastOverall && !isLastInBand ? (
                            <div
                              className={cn(
                                "bjn-connector mx-0.5 h-[2px] shrink-0 rounded-full bg-gradient-to-r",
                                density === "compact" ? "w-2.5 sm:w-3" : "w-4 sm:w-5",
                                globalIdx < focusIndex
                                  ? connectorTone.connectorDone
                                  : connectorTone.connector,
                              )}
                              aria-hidden
                            />
                          ) : null}
                          {!isLastOverall && isLastInBand ? (
                            <div
                              className={cn(
                                "bjn-connector mx-1 h-[2px] shrink-0 rounded-full bg-gradient-to-r",
                                density === "compact" ? "w-2 sm:w-3" : "w-3 sm:w-4",
                                globalIdx < focusIndex
                                  ? connectorTone.connectorDone
                                  : connectorTone.connector,
                              )}
                              aria-hidden
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
