"use client";

import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import {
  buildJourneyHref,
  getLeadJourneyModule,
  getNextLeadJourneyModule,
  getPreviousLeadJourneyModule,
  journeyStageEyebrow,
  type LeadJourneyModuleId,
} from "@/constants/lead-opportunity-journey";
import {
  getBusinessBackLabel,
  getBusinessContinueLabel,
  leadModuleToBusinessJourneyNavId,
  getNextBusinessJourneyNavStep,
  getPreviousBusinessJourneyNavStep,
  buildBusinessJourneyHref,
} from "@/constants/enterprise-business-journey-navigation";
import {
  getBusinessJourneyTransitionPurpose,
  leadModuleToNavigatorStageId,
  businessNavIdToNavigatorStageId,
} from "@/constants/enterprise-business-journey-navigator";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import {
  BusinessJourneyNavigator,
  BusinessTransitionCard,
} from "@/components/catalyst-one/business-journey-navigator";
import { PhaseReadinessDashboard } from "@/components/catalyst-one/phase-readiness-dashboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface JourneyContextChips {
  opportunity?: string;
  customer?: string;
  product?: string;
  amount?: string;
  stage?: string;
  rm?: string;
  life?: string;
}

export interface LeadOpportunityJourneyChromeProps {
  moduleId: LeadJourneyModuleId;
  /** Override business stage eyebrow (e.g. Opportunity after LIFE finalize). */
  stageOverride?: "lead" | "opportunity";
  /** Override module title (e.g. customer name as workspace identity). */
  title?: string;
  /** Single-line meta under title — prefer over chip rows. */
  identityLine?: string;
  context?: JourneyContextChips;
  /** Hide context chip row (use identityLine instead). */
  hideContextChips?: boolean;
  /** Compact Enterprise Workspace Header (~40–50% shorter). */
  density?: "default" | "compact";
  /** Primary contextual actions (Action Center) — before Save. */
  headerActions?: React.ReactNode;
  fileId?: string | null;
  opportunityId?: string | null;
  onSaveDraft?: () => void | Promise<void>;
  /** Extra validation before Continue (return false to block). */
  onBeforeContinue?: () => boolean | Promise<boolean>;
  saving?: boolean;
  className?: string;
  children?: React.ReactNode;
  hideContinue?: boolean;
  hideBack?: boolean;
  /** Hide Business Journey Navigator strip (rare). */
  hideJourneyNavigator?: boolean;
  /** Hide Phase Readiness Dashboard (rare). */
  hidePhaseReadiness?: boolean;
  /** LIFE finalized — improves Lead Qualification readiness. */
  lifeFinalized?: boolean;
}

/**
 * Shared Lead / Opportunity journey chrome — Navigator + Workspace Header + Transition Card.
 * Continue / Back preserve transaction context (never dashboards).
 */
export function LeadOpportunityJourneyChrome({
  moduleId,
  stageOverride,
  title,
  identityLine,
  context,
  hideContextChips = false,
  density = "default",
  headerActions,
  fileId,
  opportunityId,
  onSaveDraft,
  onBeforeContinue,
  saving,
  className,
  children,
  hideContinue,
  hideBack,
  hideJourneyNavigator,
  hidePhaseReadiness,
  lifeFinalized,
}: LeadOpportunityJourneyChromeProps) {
  const router = useRouter();
  const mod = getLeadJourneyModule(moduleId);
  const stage = stageOverride ?? mod.stage;
  const nextModule = getNextLeadJourneyModule(moduleId);
  const prevModule = getPreviousLeadJourneyModule(moduleId);
  const navId = leadModuleToBusinessJourneyNavId(moduleId);
  const nextNav = getNextBusinessJourneyNavStep(navId);
  const prevNav = getPreviousBusinessJourneyNavStep(navId);
  const compact = density === "compact";
  const navigatorStageId = leadModuleToNavigatorStageId(moduleId);

  const continueLabel = nextNav
    ? getBusinessContinueLabel(nextNav)
    : nextModule
      ? `Continue to ${nextModule.label}`
      : null;
  const backLabel = prevNav
    ? getBusinessBackLabel(prevNav)
    : prevModule
      ? `Back to ${prevModule.label}`
      : null;
  const continuePurpose = nextNav
    ? getBusinessJourneyTransitionPurpose(businessNavIdToNavigatorStageId(nextNav.id))
    : nextModule
      ? getBusinessJourneyTransitionPurpose(leadModuleToNavigatorStageId(nextModule.id))
      : null;

  const rememberContext = () => {
    if (!fileId) return;
    setActiveOpportunityContext({
      fileId,
      opportunityId: opportunityId ?? undefined,
      customerName: context?.customer,
      product: context?.product,
      label: context?.opportunity,
    });
  };

  const handleContinue = async () => {
    if (onBeforeContinue) {
      const ok = await onBeforeContinue();
      if (!ok) return;
    }
    if (onSaveDraft) await onSaveDraft();
    rememberContext();
    if (nextNav) {
      router.push(
        buildBusinessJourneyHref(nextNav, { fileId, opportunityId }),
      );
      return;
    }
    if (!nextModule) return;
    router.push(
      buildJourneyHref(nextModule.href, {
        fileId,
        opportunityId,
      }),
    );
  };

  const handleBack = () => {
    rememberContext();
    if (prevNav) {
      router.push(buildBusinessJourneyHref(prevNav, { fileId, opportunityId }));
      return;
    }
    if (!prevModule) return;
    router.push(
      buildJourneyHref(prevModule.href, {
        fileId,
        opportunityId,
      }),
    );
  };

  const chips: Array<{ label: string; value: string }> = hideContextChips
    ? []
    : ([
        context?.opportunity ? { label: "Opportunity", value: context.opportunity } : null,
        context?.customer ? { label: "Customer", value: context.customer } : null,
        context?.product ? { label: "Product", value: context.product } : null,
        context?.amount ? { label: "Loan Amount", value: context.amount } : null,
        context?.life ? { label: "Selected LIFE", value: context.life } : null,
        context?.stage ? { label: "Stage", value: context.stage } : null,
        context?.rm ? { label: "RM", value: context.rm } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>);

  const displayTitle = title?.trim() || mod.title;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        {!hideJourneyNavigator ? (
          <BusinessJourneyNavigator currentStageId={navigatorStageId} />
        ) : null}
        {!hidePhaseReadiness && (fileId || opportunityId) ? (
          <PhaseReadinessDashboard
            fileId={fileId}
            lifeFinalized={lifeFinalized}
            hasContact={Boolean(context?.customer)}
            hasOpportunity={Boolean(fileId || opportunityId || context?.opportunity)}
            customerName={context?.customer}
            productLabel={context?.product}
          />
        ) : null}
        <header>
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 sm:px-5",
              compact ? "py-1.5" : "py-2",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <p
                  className={cn(
                    "shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em]",
                    stage === "lead"
                      ? "text-teal-700/90 dark:text-teal-300/90"
                      : "text-violet-700/90 dark:text-violet-300/90",
                  )}
                >
                  {journeyStageEyebrow(stage)}
                </p>
                <h1
                  className={cn(
                    "truncate font-semibold tracking-tight text-foreground",
                    compact ? "text-sm sm:text-base" : "text-base sm:text-lg",
                  )}
                >
                  {displayTitle}
                </h1>
              </div>
              {identityLine ? (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{identityLine}</p>
              ) : null}
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {chips.map((c) => (
                    <span
                      key={c.label}
                      className="inline-flex max-w-[180px] items-center gap-1 rounded border border-border/50 bg-muted/20 px-1.5 py-px text-[10px]"
                    >
                      <span className="font-medium text-muted-foreground">{c.label}</span>
                      <span className="truncate font-semibold text-foreground">{c.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {headerActions}
              {onSaveDraft && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={saving}
                  onClick={() => void onSaveDraft()}
                >
                  <Save className="h-3 w-3" />
                  Save Draft
                </Button>
              )}
              <BusinessTransitionCard
                continueLabel={continueLabel}
                continuePurpose={continuePurpose}
                onContinue={() => void handleContinue()}
                backLabel={backLabel}
                onBack={handleBack}
                hideContinue={hideContinue}
                hideBack={hideBack}
                disabled={saving}
              />
            </div>
          </div>
        </header>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
