"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
import {
  getNextOpportunityWorkspaceStage,
  getPreviousOpportunityWorkspaceStage,
  type OpportunityWorkspaceStageId,
} from "@/constants/opportunity-workspace-stages";
import { buildCanonicalJourneyStageHref } from "@/constants/canonical-journey-header";
import type { EnterpriseWorkspaceScrollMode } from "@/constants/enterprise-workspace-ux";
import {
  WORKSPACE_SAVE_LOADING_LABEL,
  WORKSPACE_SAVE_SUCCESS_TOAST,
} from "@/constants/enterprise-workspace-ux";
import { WORKSPACE_CLOSE } from "@/constants/workspace-navigation";
import { buildJourneyBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { ROUTES } from "@/constants/routes";
import { runWithFeedback } from "@/lib/action-feedback";
import { readMyDealsReturnState, rememberMyDealsReturnState } from "@/lib/my-deals/view-state";
import { setActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import { loadLeadJourneyLoanFile, loadOpportunityJourneyRuntime } from "@/lib/lead-opportunity-journey/load-context";
import {
  BusinessJourneyNavigator,
  BusinessTransitionCard,
  WorkflowProgressControl,
} from "@/components/catalyst-one/business-journey-navigator";
import { OpportunityWorkspaceStageRail } from "@/components/catalyst-one/opportunity-workspace/opportunity-workspace-stage-rail";
import {
  ChanakyaCompactLive,
  TransactionInsightsPanel,
} from "@/components/catalyst-one/shared/transaction-insights-panel";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import {
  DisbursementDocumentGateDialog,
  listPendingMandatoryDocuments,
} from "@/components/catalyst-one/shared/disbursement-document-gate-dialog";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { derivePhaseReadiness } from "@/lib/enterprise-phase-readiness";
import type { ChanakyaLoanJourneyStageId } from "@/types/chanakya-guide";
import type { LoanFile } from "@/types/catalyst-one";
import type { EdieChecklistItem } from "@/types/edie-certified-rules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  /**
   * CO-UX-015 — Optional centre slot (e.g. Enterprise Action Center).
   * When set, header uses LEFT summary · CENTRE actions · RIGHT command bar.
   */
  headerCenter?: React.ReactNode;
  /** Hide Chanakya compact live strip (Deal Workspace — Action Center owns centre). */
  hideChanakyaCompact?: boolean;
  /**
   * Structured meta under the title (no truncation of the title).
   * Prefer over a single truncated identityLine when space is tight.
   */
  identityMeta?: Array<{ label: string; value: string }>;
  /** When true, borrower / title never line-clamps (Deal Workspace). */
  titleFullyVisible?: boolean;
  fileId?: string | null;
  opportunityId?: string | null;
  onSaveDraft?: () => void | Promise<void>;
  /**
   * BAT #13 — toast after Save. Default on for platform consistency.
   * Set false when the workspace already shows its own save confirmation.
   */
  notifySaveFeedback?: boolean;
  /** Override success toast copy (e.g. "Opportunity saved successfully."). */
  saveSuccessMessage?: string;
  /** Extra validation before Continue (return false to block). */
  onBeforeContinue?: () => boolean | Promise<boolean>;
  /**
   * Journey ribbon stage click gate. Return false to block.
   * Default: Disbursement blocked when mandatory documents pending.
   */
  onBeforeStageNavigate?: (
    stageId: ChanakyaLoanJourneyStageId,
  ) => boolean | Promise<boolean>;
  saving?: boolean;
  className?: string;
  children?: React.ReactNode;
  hideContinue?: boolean;
  hideBack?: boolean;
  /** Override Continue label (e.g. LIFE → Move to Deal). */
  continueLabelOverride?: string | null;
  /** Override Continue handler (business transition instead of stage navigation). */
  onContinueOverride?: () => void | Promise<void>;
  /** Hide Business Journey Navigator strip (rare). */
  hideJourneyNavigator?: boolean;
  /**
   * ribbon — permanent navigator strip (default; Loan / Document Center / Setup).
   * button — compact "Workflow Progress" control (Strategic + Credit Workbench only).
   */
  journeyNavigatorMode?: "ribbon" | "button";
  /** Hide Phase Readiness Dashboard (rare). */
  hidePhaseReadiness?: boolean;
  /**
   * CO-ARCH — When set, chrome is on the Canonical Journey (Opportunity phase aliases).
   * Shows CanonicalJourneyHeader and Continue/Back walk the frozen 7-stage sequence.
   */
  opportunityWorkspaceStage?: OpportunityWorkspaceStageId;
  /** LIFE finalized — improves Lead Qualification readiness. */
  lifeFinalized?: boolean;
  /**
   * document (default) — natural page scroll.
   * locked-split — dual-pane desks (Credit Workbench document preview).
   */
  scrollMode?: EnterpriseWorkspaceScrollMode;
  /** Close destination — defaults to My Deals. Pass null to hide Close. */
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
 * Journey ribbon is primary navigation. Save · My Deals · Close stay top-right.
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
  headerCenter,
  hideChanakyaCompact = false,
  identityMeta,
  titleFullyVisible = false,
  fileId,
  opportunityId,
  onSaveDraft,
  notifySaveFeedback = true,
  saveSuccessMessage = WORKSPACE_SAVE_SUCCESS_TOAST,
  onBeforeContinue,
  onBeforeStageNavigate,
  saving,
  className,
  children,
  hideContinue,
  hideBack,
  continueLabelOverride,
  onContinueOverride,
  hideJourneyNavigator,
  journeyNavigatorMode = "ribbon",
  hidePhaseReadiness,
  opportunityWorkspaceStage,
  lifeFinalized,
  scrollMode = "document",
  closeTo = WORKSPACE_CLOSE.MY_DEALS,
  onClose,
  hasUnsavedChanges = false,
  onSaveAndClose,
  acknowledgeCleanClose = false,
  collapseOnScroll = true,
}: LeadOpportunityJourneyChromeProps) {
  const router = useRouter();
  const [chromeSaving, setChromeSaving] = useState(false);
  const mod = getLeadJourneyModule(moduleId);
  const stage = stageOverride ?? mod.stage;
  const nextModule = getNextLeadJourneyModule(moduleId);
  const prevModule = getPreviousLeadJourneyModule(moduleId);
  const navId = leadModuleToBusinessJourneyNavId(moduleId);
  const nextNav = getNextBusinessJourneyNavStep(navId);
  const prevNav = getPreviousBusinessJourneyNavStep(navId);
  const compact = density === "compact";
  const navigatorStageId = leadModuleToNavigatorStageId(moduleId);
  const owNext = opportunityWorkspaceStage
    ? getNextOpportunityWorkspaceStage(opportunityWorkspaceStage)
    : null;
  const owPrev = opportunityWorkspaceStage
    ? getPreviousOpportunityWorkspaceStage(opportunityWorkspaceStage)
    : null;

  const [myDealsConfirmOpen, setMyDealsConfirmOpen] = useState(false);
  const [myDealsSaving, setMyDealsSaving] = useState(false);
  const [disbursementGateOpen, setDisbursementGateOpen] = useState(false);
  const [gateFile, setGateFile] = useState<LoanFile | null>(null);
  const [gatePending, setGatePending] = useState<EdieChecklistItem[]>([]);

  const handleExit = useCallback(() => {
    if (closeTo === WORKSPACE_CLOSE.MY_DEALS) {
      const existing = readMyDealsReturnState();
      rememberMyDealsReturnState(existing ?? { view: "kanban", filterId: "my_deals" });
    }
    if (onClose) {
      onClose();
      return;
    }
    if (closeTo) router.push(closeTo);
  }, [closeTo, onClose, router]);

  /** BAT #13 — loading + success/error feedback for every journey Save. */
  const executeSaveDraft = useCallback(async () => {
    if (!onSaveDraft) return;
    setChromeSaving(true);
    try {
      if (notifySaveFeedback) {
        await runWithFeedback(WORKSPACE_SAVE_LOADING_LABEL, () => onSaveDraft(), {
          successMessage: saveSuccessMessage,
        });
      } else {
        await onSaveDraft();
      }
    } finally {
      setChromeSaving(false);
    }
  }, [notifySaveFeedback, onSaveDraft, saveSuccessMessage]);

  const showClose = Boolean(onClose || closeTo);
  const closeApi = useWorkspaceClose({
    onClose: handleExit,
    hasUnsavedChanges,
    onSaveAndClose:
      onSaveAndClose ??
      (onSaveDraft
        ? async () => {
            // Close path uses WORKSPACE_CLEAN_CLOSE_TOAST — avoid double success toasts.
            await onSaveDraft();
          }
        : undefined),
    acknowledgeCleanClose,
    enableEscapeKey: showClose,
  });

  const requestMyDeals = useCallback(() => {
    if (hasUnsavedChanges) {
      setMyDealsConfirmOpen(true);
      return;
    }
    handleExit();
  }, [hasUnsavedChanges, handleExit]);

  const handleSaveAndGoMyDeals = useCallback(async () => {
    setMyDealsSaving(true);
    try {
      if (onSaveAndClose) {
        const result = await onSaveAndClose();
        if (result === false) return;
      } else if (onSaveDraft) {
        await onSaveDraft();
      }
      setMyDealsConfirmOpen(false);
      toast.success("All changes saved.", { duration: 2200 });
      handleExit();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to save before leaving. Please try again.",
      );
    } finally {
      setMyDealsSaving(false);
    }
  }, [handleExit, onSaveAndClose, onSaveDraft]);

  const refreshDisbursementGate = useCallback(() => {
    void loadOpportunityJourneyRuntime(fileId ?? null, opportunityId).then((file) => {
      const pending = listPendingMandatoryDocuments(file);
      setGateFile(file);
      setGatePending(pending);
      if (pending.length === 0) {
        setDisbursementGateOpen(false);
      }
    });
  }, [fileId, opportunityId]);

  const handleBeforeStageNavigate = useCallback(
    async (stageId: ChanakyaLoanJourneyStageId) => {
      if (onBeforeStageNavigate) {
        return onBeforeStageNavigate(stageId);
      }
      if (stageId !== "disbursement") return true;
      const file =
        (await loadOpportunityJourneyRuntime(fileId ?? null, opportunityId)) ||
        loadLeadJourneyLoanFile(fileId ?? null, opportunityId);
      const pending = listPendingMandatoryDocuments(file);
      if (pending.length === 0) return true;
      setGateFile(file);
      setGatePending(pending);
      setDisbursementGateOpen(true);
      return false;
    },
    [fileId, onBeforeStageNavigate, opportunityId],
  );

  const continueLabel =
    continueLabelOverride !== undefined
      ? continueLabelOverride
      : opportunityWorkspaceStage
        ? owNext
          ? `Continue to ${owNext.label}`
          : null
        : nextNav
          ? getBusinessContinueLabel(nextNav)
          : nextModule
            ? `Continue to ${nextModule.label}`
            : null;
  const backLabel = opportunityWorkspaceStage
    ? owPrev
      ? `Back to ${owPrev.label}`
      : null
    : prevNav
      ? getBusinessBackLabel(prevNav)
      : prevModule
        ? `Back to ${prevModule.label}`
        : null;
  const continuePurpose = opportunityWorkspaceStage
    ? owNext?.purpose ?? null
    : nextNav
      ? getBusinessJourneyTransitionPurpose(businessNavIdToNavigatorStageId(nextNav.id))
      : nextModule
        ? getBusinessJourneyTransitionPurpose(leadModuleToNavigatorStageId(nextModule.id))
        : null;

  const rememberContext = () => {
    if (!opportunityId && !fileId) return;
    // Opportunity Workspace SSOT: never invent fileId from opportunityId.
    setActiveOpportunityContext({
      ...(opportunityId ? { opportunityId } : {}),
      ...(fileId && fileId !== opportunityId ? { fileId } : {}),
      customer: context?.customer,
      customerName: context?.customer,
      product: context?.product,
      opportunityReference: context?.opportunity,
      label: context?.opportunity,
      stage: context?.stage,
      owner: context?.rm,
    });
  };

  const handleContinue = async () => {
    if (onContinueOverride) {
      await onContinueOverride();
      return;
    }
    if (onBeforeContinue) {
      const ok = await onBeforeContinue();
      if (!ok) return;
    }
    if (onSaveDraft) await onSaveDraft();
    rememberContext();
    if (opportunityWorkspaceStage && owNext) {
      router.push(
        buildCanonicalJourneyStageHref(owNext.id, { fileId, opportunityId }),
      );
      return;
    }
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
    if (opportunityWorkspaceStage && owPrev) {
      router.push(
        buildCanonicalJourneyStageHref(owPrev.id, { fileId, opportunityId }),
      );
      return;
    }
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
    !opportunityWorkspaceStage &&
    !hideJourneyNavigator &&
    journeyNavigatorMode === "button";
  const showRibbonNavigator =
    !opportunityWorkspaceStage &&
    !hideJourneyNavigator &&
    journeyNavigatorMode === "ribbon";
  const hideTransition = Boolean(hideContinue && hideBack);

  const exitBreadcrumbs = useMemo(() => {
    const base = buildJourneyBreadcrumbs(moduleId);
    return base.map((crumb) => {
      if (!crumb.href) return crumb;
      if (crumb.href === ROUTES.DASHBOARD || crumb.href === ROUTES.MY_DEALS) return crumb;
      return {
        ...crumb,
        href: buildJourneyHref(crumb.href, { fileId, opportunityId }),
      };
    });
  }, [moduleId, fileId, opportunityId]);

  const chrome = (
    <>
      <WorkspaceExitNav breadcrumbs={exitBreadcrumbs} />
      <div
        className={cn(
          /* Instant collapse — animated height on sticky chrome causes viewport shake. */
          "grid",
          "grid-rows-[1fr]",
          "group-data-[chrome-collapsed=true]/ews:grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {opportunityWorkspaceStage ? (
            <OpportunityWorkspaceStageRail
              currentStage={opportunityWorkspaceStage}
              fileId={fileId}
              opportunityId={opportunityId}
              customerName={context?.customer}
              product={context?.product}
              label={context?.opportunity}
            />
          ) : null}
          {showRibbonNavigator ? (
            <BusinessJourneyNavigator
              currentStageId={navigatorStageId}
              fileId={fileId}
              opportunityId={opportunityId}
              allowForwardNavigation
              onBeforeStageNavigate={handleBeforeStageNavigate}
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
            "grid gap-x-4 gap-y-2 px-4 sm:px-5",
            "grid-cols-1",
            headerCenter
              ? "lg:grid-cols-[minmax(0,1.35fr)_auto_minmax(0,1fr)] lg:items-center"
              : "md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:items-start",
            compact ? "py-1.5" : "py-2",
          )}
        >
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <p
              className={cn(
                "min-w-0 truncate text-[9px] font-semibold uppercase tracking-[0.16em]",
                stage === "lead"
                  ? "text-teal-700/90 dark:text-teal-300/90"
                  : "text-violet-700/90 dark:text-violet-300/90",
              )}
              title={journeyStageEyebrow(stage)}
            >
              {journeyStageEyebrow(stage)}
            </p>
            <h1
              className={cn(
                "mt-0.5 min-w-0 break-words text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg [overflow-wrap:anywhere]",
                titleFullyVisible ? null : "line-clamp-2",
              )}
              title={displayTitle}
            >
              {displayTitle}
            </h1>
            {identityMeta && identityMeta.length > 0 ? (
              <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-snug">
                {identityMeta.map((item) => (
                  <div
                    key={`${item.label}:${item.value}`}
                    className="inline-flex min-w-0 max-w-full items-baseline gap-1"
                  >
                    <dt className="shrink-0 font-medium text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd
                      className="min-w-0 break-words font-semibold text-foreground [overflow-wrap:anywhere]"
                      title={item.value}
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : compactIdentity ? (
              <p className="mt-0.5 min-w-0 break-words text-[10px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                {compactIdentity}
              </p>
            ) : null}
            {showChipRow ? (
              <div className="flex flex-wrap gap-1 pt-1 group-data-[chrome-collapsed=true]/ews:hidden">
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex max-w-[min(100%,12rem)] items-center gap-1 rounded border border-border/50 bg-muted/20 px-1.5 py-px text-[10px]"
                  >
                    <span className="shrink-0 font-medium text-muted-foreground">{c.label}</span>
                    <span className="min-w-0 truncate font-semibold text-foreground">{c.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {headerCenter ? (
            <div className="flex min-w-0 items-center justify-start lg:col-start-2 lg:row-start-1 lg:justify-center">
              {headerCenter}
            </div>
          ) : !hideChanakyaCompact ? (
            <div
              className={cn(
                "hidden min-w-0 w-full max-w-[18rem] justify-self-end md:col-start-2 md:row-start-1 md:block",
                "group-data-[chrome-collapsed=true]/ews:hidden",
              )}
            >
              <ChanakyaCompactLive
                message={chanakyaLine}
                className="h-auto min-h-7 w-full max-w-none overflow-hidden"
              />
            </div>
          ) : null}

          <div
            className={cn(
              "flex min-w-0 flex-wrap items-center justify-end gap-1.5",
              headerCenter
                ? "lg:col-start-3 lg:row-start-1"
                : "md:col-span-2",
            )}
          >
            {useWorkflowButton ? (
              <WorkflowProgressControl
                currentStageId={navigatorStageId}
                fileId={fileId}
                opportunityId={opportunityId}
                onBeforeStageNavigate={handleBeforeStageNavigate}
              />
            ) : null}
            {headerActions}
            {!hideTransition ? (
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
            ) : null}
            {showClose ? (
              <WorkspacePrimaryActions
                mode={onSaveDraft || onSaveAndClose ? "editable" : "readonly"}
                density="compact"
                saving={Boolean(saving || chromeSaving || closeApi.saving || myDealsSaving)}
                onClose={closeApi.requestClose}
                onSave={
                  onSaveDraft
                    ? async () => {
                        await executeSaveDraft();
                      }
                    : undefined
                }
                onMyDeals={
                  onSaveDraft || onSaveAndClose ? requestMyDeals : undefined
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
          variant="close"
        />
      ) : null}
      {showClose ? (
        <UnsavedChangesDialog
          open={myDealsConfirmOpen}
          onOpenChange={setMyDealsConfirmOpen}
          onDiscard={() => {
            setMyDealsConfirmOpen(false);
            handleExit();
          }}
          onSaveAndClose={
            onSaveAndClose || onSaveDraft ? handleSaveAndGoMyDeals : undefined
          }
          saving={myDealsSaving}
          variant="my-deals"
        />
      ) : null}
      <DisbursementDocumentGateDialog
        open={disbursementGateOpen}
        onOpenChange={setDisbursementGateOpen}
        file={gateFile}
        pendingItems={gatePending}
        onUploaded={refreshDisbursementGate}
      />
    </>
  );
}
