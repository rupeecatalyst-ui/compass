"use client";

import { useRouter } from "next/navigation";
import {
  Check,
  ClipboardList,
  FileStack,
  Flag,
  Scale,
  Sparkles,
  Trophy,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import {
  CANONICAL_JOURNEY_HEADER_NAME,
  CANONICAL_JOURNEY_STAGES,
  buildCanonicalJourneyStageHref,
  resolveCanonicalJourneyStageStatus,
  type CanonicalJourneyStageId,
} from "@/constants/canonical-journey-header";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { cn } from "@/lib/utils";

const STAGE_ICONS: Record<CanonicalJourneyStageId, LucideIcon> = {
  lead_creation: ClipboardList,
  documents: FileStack,
  credit_bench: Scale,
  life: Sparkles,
  lender_pipeline: Waypoints,
  disbursed: Flag,
  journey_complete: Trophy,
};

export interface CanonicalJourneyHeaderProps {
  currentStage: CanonicalJourneyStageId;
  fileId?: string | null;
  opportunityId?: string | null;
  customerName?: string | null;
  product?: string | null;
  label?: string | null;
  className?: string;
}

export type CanonicalJourneyNavigateContext = {
  fileId?: string | null;
  opportunityId?: string | null;
  customerName?: string | null;
  product?: string | null;
  label?: string | null;
};

/**
 * Single navigation implementation for Canonical Journey Header stage hops
 * (including Pipeline / Lender Pipeline). Callers must reuse this — do not duplicate.
 */
export function navigateToCanonicalJourneyStage(
  router: { push: (href: string) => void },
  stageId: CanonicalJourneyStageId,
  context: CanonicalJourneyNavigateContext,
  options?: { navigable?: boolean },
): void {
  if (options?.navigable === false) return;
  const { fileId, opportunityId, customerName, product, label } = context;
  // On Deal Workspace, fileId is the Enterprise Deal id (CO-ARCH-007 / CO-BUG-009).
  const dealId = fileId?.trim() || null;
  if (opportunityId) {
    setActiveOpportunityContext({
      opportunityId,
      ...(dealId && dealId !== opportunityId ? { fileId: dealId } : {}),
      customer: customerName ?? undefined,
      customerName: customerName ?? undefined,
      product: product ?? undefined,
      opportunityReference: label ?? undefined,
      label: label ?? undefined,
    });
  }
  router.push(
    buildCanonicalJourneyStageHref(stageId, {
      fileId: dealId,
      dealId,
      opportunityId,
    }),
  );
}

/**
 * CO-ARCH — Frozen Canonical Journey Header.
 * Shown on all Opportunity and Deal execution workspaces.
 */
export function CanonicalJourneyHeader({
  currentStage,
  fileId,
  opportunityId,
  customerName,
  product,
  label,
  className,
}: CanonicalJourneyHeaderProps) {
  const router = useRouter();

  const navigateTo = (stageId: CanonicalJourneyStageId, navigable: boolean) => {
    navigateToCanonicalJourneyStage(
      router,
      stageId,
      { fileId, opportunityId, customerName, product, label },
      { navigable },
    );
  };

  return (
    <div
      className={cn(
        "w-full shrink-0 border-b border-border/60 bg-gradient-to-r from-slate-50/95 via-white to-teal-50/35 px-2 py-1 dark:from-zinc-950 dark:via-zinc-950 dark:to-teal-950/20 md:px-3",
        className,
      )}
      data-surface="canonical-journey-header"
      aria-label={CANONICAL_JOURNEY_HEADER_NAME}
    >
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {CANONICAL_JOURNEY_HEADER_NAME}
        </p>
        <p className="hidden text-[9px] text-muted-foreground sm:inline">
          One continuous journey · context preserved
        </p>
      </div>

      <ol className="flex min-w-0 items-stretch gap-0 overflow-x-auto pb-0.5">
        {CANONICAL_JOURNEY_STAGES.map((stage, index) => {
          const status = resolveCanonicalJourneyStageStatus(stage.id, currentStage);
          const Icon = STAGE_ICONS[stage.id];
          const isLast = index === CANONICAL_JOURNEY_STAGES.length - 1;
          const success = Boolean(stage.isSuccessDestination);

          return (
            <li key={stage.id} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => navigateTo(stage.id, stage.navigable)}
                disabled={!stage.navigable}
                title={stage.purpose}
                aria-current={status === "current" ? "step" : undefined}
                className={cn(
                  "group flex min-w-[88px] flex-1 flex-col items-start gap-0 rounded-md border px-1.5 py-1 text-left transition-all md:min-w-0",
                  status === "current" &&
                    !success &&
                    "border-teal-500/70 bg-teal-600 text-white shadow-[0_0_12px_rgba(13,148,136,0.3)]",
                  status === "current" &&
                    success &&
                    "border-amber-400/70 bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]",
                  status === "completed" &&
                    "border-teal-400/40 bg-teal-500/10 text-teal-950 dark:text-teal-100",
                  status === "upcoming" &&
                    "border-border/50 bg-muted/20 text-muted-foreground",
                  stage.navigable &&
                    status === "upcoming" &&
                    "hover:border-teal-400/40 hover:bg-teal-500/5",
                  !stage.navigable && "cursor-default opacity-80",
                )}
              >
                <div className="flex w-full items-center gap-1">
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px] font-semibold",
                      status === "current" && "border-white/40 bg-white/15 text-white",
                      status === "completed" &&
                        "border-teal-500/50 bg-teal-600 text-white",
                      status === "upcoming" && "border-border bg-background",
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="h-2.5 w-2.5" aria-hidden />
                    ) : (
                      <Icon className="h-2.5 w-2.5" aria-hidden />
                    )}
                  </span>
                  <span className="truncate text-[9px] font-semibold tracking-tight md:text-[10px]">
                    {stage.shortLabel}
                  </span>
                  {status === "current" ? (
                    <span className="ml-auto hidden rounded px-1 py-px text-[7px] font-medium uppercase tracking-wide text-white/90 lg:inline">
                      Current
                    </span>
                  ) : null}
                </div>
              </button>

              {!isLast ? (
                <div
                  className={cn(
                    "mx-0.5 hidden h-0.5 w-2.5 shrink-0 rounded-full sm:block md:mx-1 md:w-4",
                    status === "completed" || status === "current"
                      ? "bg-gradient-to-r from-teal-500 to-teal-400/40"
                      : "bg-border/70",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** @deprecated Prefer CanonicalJourneyHeader */
export function OpportunityWorkspaceStageRail(
  props: {
    currentStage:
      | "opportunity_creation"
      | "document_center"
      | "credit_workbench"
      | "strategy_workbench";
    fileId?: string | null;
    opportunityId?: string | null;
    customerName?: string | null;
    product?: string | null;
    label?: string | null;
    className?: string;
  },
) {
  const map = {
    opportunity_creation: "lead_creation",
    document_center: "documents",
    credit_workbench: "credit_bench",
    strategy_workbench: "life",
  } as const;
  return (
    <CanonicalJourneyHeader
      {...props}
      currentStage={map[props.currentStage]}
    />
  );
}
