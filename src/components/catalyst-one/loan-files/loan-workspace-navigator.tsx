"use client";

/**
 * Execution Hub — single-screen Loan Journey roadmap (UI/UX only).
 * Fits a standard laptop viewport (~1920×1080) without vertical scrolling.
 * Roadmap philosophy: start → current → next → successful destination.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  ClipboardList,
  FileStack,
  Flag,
  Lock,
  PartyPopper,
  Scale,
  Sparkles,
  Trophy,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import {
  EXECUTION_HUB_JOURNEY_STEPS,
  LOAN_WORKSPACE_HUB_OFFICIAL_NAME,
  LOAN_WORKSPACE_HUB_STATUS_LINE,
  type ExecutionHubJourneyStep,
  type ExecutionHubJourneyStepId,
  type ExecutionHubJourneyVisualState,
} from "@/constants/loan-workspace-navigator";
import { ROUTES } from "@/constants/routes";
import {
  getActiveOpportunityContext,
  type ActiveOpportunityContext,
} from "@/lib/lead-opportunity-journey/active-context";
import { rememberOpportunityRegistryContext } from "@/lib/lead-opportunity-journey/opportunity-context";
import {
  enterpriseOpportunityApiClient,
  type EnterpriseOpportunityApiRecord,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import {
  buildLeadInformationHref,
  describeCurrentJourneyStage,
  isOpportunityRequirementCaptured,
  resolveContinueJourneyHref,
  resolveResumeJourneyHref,
} from "@/lib/loan-journey/adr-018-routing";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import {
  resolveChanakyaGuideEntries,
  resolveChanakyaGuideWorkspaceMeta,
} from "@/lib/chanakya-guide";
import { ChanakyaMark } from "@/components/layout/chanakya-mark";
import { cn } from "@/lib/utils";

const ICONS: Record<ExecutionHubJourneyStepId, LucideIcon> = {
  lead_creation: ClipboardList,
  documents: FileStack,
  credit_bench: Scale,
  life: Sparkles,
  lender_pipeline: Waypoints,
  disbursed: Flag,
  journey_complete: Trophy,
};

function resolveStepHref(
  step: ExecutionHubJourneyStep,
  ctx: ActiveOpportunityContext | null,
  opp: EnterpriseOpportunityApiRecord | null,
): string {
  // ADR-018 — before Requirement Captured, Lead Creation hop → Lead Information.
  if (
    step.id === "lead_creation" &&
    opp?.id &&
    !isOpportunityRequirementCaptured(opp)
  ) {
    return buildLeadInformationHref(opp.id);
  }

  // CO-UX-002 — Registry-first for every stage (Deal / Disbursement never bare /deals).
  return buildCanonicalJourneyStageHref(step.id, {
    fileId: ctx?.fileId ?? null,
    opportunityId: ctx?.opportunityId ?? opp?.id ?? null,
    dealId: ctx?.fileId ?? null,
  });
}

function RoadmapNode({
  step,
  state,
  href,
  index,
  total,
}: {
  step: ExecutionHubJourneyStep;
  state: ExecutionHubJourneyVisualState;
  href: string;
  index: number;
  total: number;
}) {
  const Icon = ICONS[step.id];
  const locked = state === "locked" || step.navigable === false;
  const completed = state === "completed";
  const current = state === "current";
  const success = Boolean(step.isSuccessDestination);

  const node = (
    <div
      className={cn(
        "group relative flex w-[7.25rem] flex-col items-center text-center sm:w-[8rem] lg:w-[8.75rem]",
        locked && !success && "opacity-70",
      )}
    >
      <span
        className={cn(
          "relative z-[1] flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-300 sm:h-12 sm:w-12",
          current &&
            "border-teal-500 bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-[0_0_0_4px_rgba(20,184,166,0.2)]",
          completed &&
            !success &&
            "border-emerald-500/60 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100",
          state === "pending" &&
            !success &&
            "border-border bg-card text-muted-foreground group-hover:border-teal-500/45 group-hover:text-foreground",
          locked &&
            !success &&
            !current &&
            "border-border/60 bg-muted/40 text-muted-foreground",
          success &&
            "border-emerald-400 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-[0_0_24px_-4px_rgba(16,185,129,0.65)] ring-2 ring-emerald-300/50",
        )}
      >
        {completed && !success ? (
          <Check className="h-5 w-5" aria-hidden />
        ) : locked && !success ? (
          <Lock className="h-4 w-4" aria-hidden />
        ) : success ? (
          <Trophy className="h-5 w-5" aria-hidden />
        ) : (
          <Icon className="h-5 w-5" aria-hidden />
        )}
        {current ? (
          <span className="pointer-events-none absolute inset-0 animate-pulse rounded-full bg-white/10" />
        ) : null}
        {success ? (
          <PartyPopper
            className="pointer-events-none absolute -right-1.5 -top-1.5 h-4 w-4 text-amber-400 drop-shadow"
            aria-hidden
          />
        ) : null}
      </span>

      <p
        className={cn(
          "mt-2 text-[10px] font-medium uppercase tracking-[0.12em]",
          success ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
        )}
      >
        {index + 1}/{total}
      </p>
      <p
        className={cn(
          "mt-0.5 line-clamp-2 text-[12px] font-semibold leading-tight tracking-tight sm:text-[13px]",
          current && "text-teal-800 dark:text-teal-200",
          success && "text-emerald-800 dark:text-emerald-100",
        )}
      >
        {step.label}
      </p>
      {current ? (
        <span className="mt-1 rounded-full bg-teal-600/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-200">
          You are here
        </span>
      ) : null}
      {success ? (
        <span className="mt-1 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
          Destination
        </span>
      ) : null}
    </div>
  );

  if (locked || step.navigable === false) {
    return (
      <div
        className="cursor-default"
        title={success ? step.description : "Locked"}
        aria-label={step.label}
      >
        {node}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      aria-current={current ? "step" : undefined}
      title={step.description}
    >
      {node}
    </Link>
  );
}

function RoadmapConnector({
  done,
  toSuccess,
}: {
  done: boolean;
  toSuccess?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-8 h-[3px] min-w-[0.75rem] flex-1 rounded-full sm:mb-9",
        toSuccess
          ? "bg-gradient-to-r from-border via-emerald-400/50 to-emerald-500"
          : done
            ? "bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500"
            : "bg-gradient-to-r from-border via-muted-foreground/20 to-border",
      )}
      aria-hidden
    />
  );
}

function CompactChanakyaGuide({ recommendedLabel }: { recommendedLabel: string }) {
  const entries = useMemo(
    () =>
      resolveChanakyaGuideEntries({
        platform: "catalyst_one",
        workspaceId: "execution_hub",
        section: "default",
      }),
    [],
  );
  const meta = useMemo(
    () =>
      resolveChanakyaGuideWorkspaceMeta({
        platform: "catalyst_one",
        workspaceId: "execution_hub",
      }),
    [],
  );
  const welcome = entries[0];
  const next = entries[1];

  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-card to-teal-500/[0.05] p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
          <ChanakyaMark size="md" status="insights" title="Chanakya" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
            Chanakya · Guide
          </p>
          <p className="truncate text-sm font-semibold tracking-tight">
            {meta?.workspaceLabel ?? "Loan Journey"}
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
        {welcome?.mentorMessage ??
          "Follow the roadmap. Start at Lead Creation and finish at Journey Complete."}
      </p>
      <div className="mt-2.5 rounded-lg border border-teal-500/25 bg-teal-500/[0.07] px-2.5 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:text-teal-200">
          Next
        </p>
        <p className="text-[12px] font-medium text-foreground">{recommendedLabel}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
          {next?.recommendedNextStep ?? welcome?.recommendedNextStep}
        </p>
      </div>
    </aside>
  );
}

/** Single-screen Loan Journey roadmap — not a dashboard. */
export function LoanWorkspaceNavigator({
  orchestrationMode = false,
}: {
  /** ADR-018 Wave 3 — /loan-journey host (Continue/Resume from Opportunity lifecycle). */
  orchestrationMode?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const opportunityIdParam = searchParams.get("opportunityId")?.trim() || null;
  const [ctx, setCtx] = useState<ActiveOpportunityContext | null>(null);
  const [opp, setOpp] = useState<EnterpriseOpportunityApiRecord | null>(null);

  useEffect(() => {
    const session = getActiveOpportunityContext();
    const opportunityId = opportunityIdParam || session?.opportunityId || null;
    if (!opportunityId) {
      setCtx(session);
      setOpp(null);
      return;
    }

    let cancelled = false;
    void enterpriseOpportunityApiClient
      .getOpportunity(opportunityId)
      .then((row) => {
        if (cancelled) return;
        const next = rememberOpportunityRegistryContext(row);
        setOpp(row);
        setCtx(next);
      })
      .catch(() => {
        if (cancelled) return;
        setCtx(session);
        setOpp(null);
      });

    return () => {
      cancelled = true;
    };
  }, [opportunityIdParam]);

  const captured = opp ? isOpportunityRequirementCaptured(opp) : false;
  const currentStage = opp ? describeCurrentJourneyStage(opp) : null;

  const stepsWithState = useMemo(() => {
    return EXECUTION_HUB_JOURNEY_STEPS.map((step, index) => {
      let state: ExecutionHubJourneyVisualState = step.defaultState;
      if (opp && orchestrationMode) {
        if (!captured) {
          // Pre-capture: Lead Creation (→ Lead Information) is current; later stages locked.
          if (step.id === "lead_creation") state = "current";
          else if (step.isSuccessDestination) state = "locked";
          else state = "locked";
        } else if (step.id === "lead_creation") {
          state = "completed";
        } else if (index === 1) {
          // Documents becomes next current after capture when still on Hub Continue → OW first.
          // Visual: Opportunity Workspace entry is still lead_creation completed; documents pending.
          state = step.defaultState === "current" ? "pending" : "pending";
        }
      }
      return {
        step,
        state,
        href: resolveStepHref(step, ctx, opp),
      };
    });
  }, [ctx, opp, captured, orchestrationMode]);

  const continueHref = opp
    ? resolveContinueJourneyHref(opp)
    : ROUTES.LEAD_INFORMATION;
  const resumeHref = opp ? resolveResumeJourneyHref(opp) : continueHref;

  const recommendedLabel = !opp
    ? "Start from Contact"
    : !captured
      ? "Lead Information"
      : "Opportunity Workspace";

  const recommendedDescription = !opp
    ? "Open a Contact and choose Start Loan Journey to create a Draft Opportunity."
    : !captured
      ? "Capture Product and Required Amount on Lead Information (Opportunity Registry only)."
      : "Continue into Opportunity Workspace for execution and enrichment.";

  const RecommendedIcon = !captured ? ICONS.lead_creation : ICONS.documents;
  const destination = stepsWithState.find((s) => s.step.isSuccessDestination)?.step;
  const total = stepsWithState.length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 py-3 md:px-6 lg:px-8 lg:py-4">
      <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col gap-3">
        {/* Compact identity — no scroll required to see the start */}
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Execution Hub · Roadmap
            </p>
            <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">
              {LOAN_WORKSPACE_HUB_OFFICIAL_NAME}
            </h1>
            <p className="max-w-2xl text-[12px] text-muted-foreground lg:text-[13px]">
              {LOAN_WORKSPACE_HUB_STATUS_LINE}
            </p>
            {currentStage ? (
              <p className="text-[11px] font-medium text-teal-800 dark:text-teal-200">
                Current stage · {currentStage.label}
                {opp?.opportunityNumber ? ` · ${opp.opportunityNumber}` : ""}
              </p>
            ) : null}
          </div>
          {ctx?.label || ctx?.customerName || opp?.primaryContactName ? (
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1.5 text-[11px]">
              <span className="font-semibold text-teal-900 dark:text-teal-100">
                {opp?.primaryContactName || ctx?.customerName || ctx?.label}
              </span>
              {opp?.productLabel || ctx?.product ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {opp?.productLabel || ctx?.product}
                </span>
              ) : (
                <span className="text-muted-foreground"> · Product not specified</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Start Loan Journey from a Contact to open a Draft Opportunity here.
            </p>
          )}
        </header>

        {/* Full journey at a glance */}
        <section
          className="shrink-0 rounded-2xl border border-border/70 bg-gradient-to-b from-slate-50/90 via-card to-card px-3 py-4 shadow-sm dark:from-zinc-900/70 sm:px-4 sm:py-5"
          aria-label="Loan journey roadmap"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Lead Creation → Journey Complete
            </p>
            <div className="flex flex-wrap gap-3 text-[9px] uppercase tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" /> Current
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Done
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/35" /> Ahead
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3 w-3 text-emerald-600" /> Success
              </span>
            </div>
          </div>

          <ol className="flex w-full items-start justify-between gap-0">
            {stepsWithState.map(({ step, state, href }, index) => (
              <li key={step.id} className="flex min-w-0 flex-1 items-start last:flex-none">
                <RoadmapNode
                  step={step}
                  state={state}
                  href={href}
                  index={index}
                  total={total}
                />
                {index < total - 1 ? (
                  <RoadmapConnector
                    done={state === "completed" || state === "current"}
                    toSuccess={stepsWithState[index + 1]?.step.isSuccessDestination}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {/* Continue + Chanakya — fills remaining height, no page scroll */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="flex min-h-0 flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-sm">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                Continue the journey
              </p>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-100">
                  <RecommendedIcon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">{recommendedLabel}</h2>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                    {recommendedDescription}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {opp ? (
                <>
                  <Link
                    href={continueHref}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-teal-600/40 bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(13,148,136,0.7)] transition-transform hover:-translate-y-0.5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    )}
                  >
                    Continue Journey
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href={resumeHref}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/60",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    )}
                  >
                    Resume Journey
                  </Link>
                </>
              ) : (
                <Link
                  href={ROUTES.CONTACTS}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-teal-600/40 bg-gradient-to-r from-teal-700 to-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(13,148,136,0.7)] transition-transform hover:-translate-y-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                  )}
                >
                  Open Contacts
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              {destination ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-900 dark:text-emerald-100">
                  <Trophy className="h-3.5 w-3.5" aria-hidden />
                  Destination: {destination.label}
                </span>
              ) : null}
            </div>
          </section>

          <CompactChanakyaGuide recommendedLabel={recommendedLabel} />
        </div>
      </div>
    </div>
  );
}
