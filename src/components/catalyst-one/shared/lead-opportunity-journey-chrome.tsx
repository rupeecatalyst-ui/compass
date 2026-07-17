"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
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
import type { EnterpriseWorkspaceScrollMode } from "@/constants/enterprise-workspace-ux";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import {
  BusinessJourneyNavigator,
  BusinessTransitionCard,
  WorkflowProgressControl,
} from "@/components/catalyst-one/business-journey-navigator";
import {
  ChanakyaCompactLive,
  TransactionInsightsPanel,
} from "@/components/catalyst-one/shared/transaction-insights-panel";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { derivePhaseReadiness } from "@/lib/enterprise-phase-readiness";
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
  /**
   * ribbon — permanent navigator strip (default; Loan / Document Center / Setup).
   * button — compact "Workflow Progress" control (Strategic + Credit Workbench only).
   */
  journeyNavigatorMode?: "ribbon" | "button";
  /** Hide Phase Readiness Dashboard (rare). */
  hidePhaseReadiness?: boolean;
  /** LIFE finalized — improves Lead Qualification readiness. */
  lifeFinalized?: boolean;
  /**
   * document (default) — natural page scroll.
   * locked-split — dual-pane desks (Credit Workbench document preview).
   */
  scrollMode?: EnterpriseWorkspaceScrollMode;
  /** Close destination — defaults to Loan Files. Pass null to hide Close. */
  closeTo?: string | null;
  onClose?: () => void;
  hasUnsavedChanges?: boolean;
  onSaveAndClose?: () => void | boolean | Promise<void | boolean>;
  /** Case C — toast "All changes saved." when closing clean. */
  acknowledgeCleanClose?: boolean;
  /** Collapse navigator / insights after scroll. Default true. */
  collapseOnScroll?: boolean;
}

/**
 * Shared Lead / Opportunity journey chrome — Navigator + compact header + Close.
 * Continues / Back preserve transaction context. Inherits Enterprise Workspace Shell.
 */
export function LeadOpportunityJourneyChrome({
  moduleId,
  stageOverride,
  title,
  identityLine,
  context,
  hideContextChips = false,
  density = "compact",
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
  journeyNavigatorMode = "ribbon",
  hidePhaseReadiness,
  lifeFinalized,
  scrollMode = "document",
  closeTo = WORKSPACE_CLOSE.LOAN_FILES,
  onClose,
  hasUnsavedChanges = false,
  onSaveAndClose,
  acknowledgeCleanClose = false,
  collapseOnScroll = true,
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

  const handleExit = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (closeTo) router.push(closeTo);
  };

  const showClose = Boolean(onClose || closeTo);
  const closeApi = useWorkspaceClose({
    onClose: handleExit,
    hasUnsavedChanges,
    onSaveAndClose:
      onSaveAndClose ??
      (onSaveDraft
        ? async () => {
            await onSaveDraft();
          }
        : undefined),
    acknowledgeCleanClose,
    enableEscapeKey: showClose,
  });

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
      router.push(buildBusinessJourneyHref(nextNav, { fileId, opportunityId }));
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

  const chanakyaLine = useMemo(() => {
    const snap = derivePhaseReadiness({
      lifeFinalized,
      hasContact: Boolean(context?.customer),
      hasOpportunity: Boolean(fileId || opportunityId || context?.opportunity),
      customerName: context?.customer,
      productLabel: context?.product,
    });
    return snap.chanakyaMessage || snap.nextBusinessAction;
  }, [
    lifeFinalized,
    context?.customer,
    context?.product,
    context?.opportunity,
    fileId,
    opportunityId,
  ]);

  /** Prefer a single identity line over repeating chip rows (anti-duplication). */
  const compactIdentity =
    identityLine ||
    [
      context?.customer,
      context?.opportunity,
      context?.product,
      context?.amount,
      context?.stage,
      context?.rm ? `RM ${context.rm}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const showChipRow = chips.length > 0 && hideContextChips === false && !compactIdentity;
  const useWorkflowButton =
    !hideJourneyNavigator && journeyNavigatorMode === "button";
  const showRibbonNavigator =
    !hideJourneyNavigator && journeyNavigatorMode === "ribbon";

  const chrome = (
    <>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          "grid-rows-[1fr]",
          "group-data-[chrome-collapsed=true]/ews:grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {showRibbonNavigator ? (
            <BusinessJourneyNavigator
              currentStageId={navigatorStageId}
              fileId={fileId}
              opportunityId={opportunityId}
            />
          ) : null}
          {!hidePhaseReadiness && (fileId || opportunityId) ? (
            <TransactionInsightsPanel
              fileId={fileId}
              lifeFinalized={lifeFinalized}
              hasContact={Boolean(context?.customer)}
              hasOpportunity={Boolean(fileId || opportunityId || context?.opportunity)}
              customerName={context?.customer}
              productLabel={context?.product}
            />
          ) : null}
        </div>
      </div>
      <header>
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-5",
            compact ? "py-1" : "py-1.5",
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
              <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                {displayTitle}
              </h1>
              <ChanakyaCompactLive
                message={chanakyaLine}
                className="hidden group-data-[chrome-collapsed=true]/ews:hidden md:flex"
              />
            </div>
            {compactIdentity ? (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{compactIdentity}</p>
            ) : null}
            {showChipRow ? (
              <div className="flex flex-wrap gap-1 pt-1 group-data-[chrome-collapsed=true]/ews:hidden">
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
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {useWorkflowButton ? (
              <WorkflowProgressControl
                currentStageId={navigatorStageId}
                fileId={fileId}
                opportunityId={opportunityId}
              />
            ) : null}
            {headerActions}
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
            {showClose ? (
              <WorkspacePrimaryActions
                mode={onSaveDraft || onSaveAndClose ? "editable" : "readonly"}
                density="compact"
                saving={saving || closeApi.saving}
                onClose={closeApi.requestClose}
                onSave={
                  onSaveDraft
                    ? async () => {
                        await onSaveDraft();
                      }
                    : undefined
                }
                onSaveAndExit={
                  onSaveDraft || onSaveAndClose
                    ? async () => {
                        await closeApi.handleSaveAndClose();
                      }
                    : undefined
                }
              />
            ) : null}
          </div>
        </div>
      </header>
    </>
  );

  return (
    <>
      <EnterpriseWorkspaceShell
        className={className}
        scrollMode={scrollMode}
        collapseOnScroll={collapseOnScroll}
        chrome={chrome}
        bodyClassName={cn(scrollMode === "locked-split" && "overflow-hidden")}
      >
        {children}
      </EnterpriseWorkspaceShell>
      {showClose ? (
        <UnsavedChangesDialog
          open={closeApi.confirmOpen}
          onOpenChange={closeApi.setConfirmOpen}
          onDiscard={closeApi.handleDiscard}
          onSaveAndClose={
            onSaveAndClose || onSaveDraft ? closeApi.handleSaveAndClose : undefined
          }
          saving={closeApi.saving}
        />
      ) : null}
    </>
  );
}
