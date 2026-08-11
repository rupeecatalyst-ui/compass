"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { FileTimeline } from "@/components/catalyst-one/loan-files/file-timeline";
import { LoanWorkbenchLayout } from "@/components/catalyst-one/shared/loan-workbench-layout";
import { LoanWorkbenchSection } from "@/components/catalyst-one/shared/loan-workbench-section";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { LoanStructureCommandControl } from "@/components/catalyst-one/shared/loan-structure-drawer";
import { IntelligentPayeeCaptureHost } from "@/components/catalyst-one/shared/intelligent-payee-capture";
import type { LoanStructureNavTarget } from "@/lib/loan-structure";
import { syncLoanStructureRelationships } from "@/lib/loan-structure";
import { useLoanJourneyEcm } from "@/hooks/use-loan-journey-ecm";
import { LoanActionCenter } from "@/components/catalyst-one/action-center";
import {
  BusinessNotesActionButton,
  EnterpriseBusinessNotesPanel,
} from "@/components/catalyst-one/enterprise-business-notes";
import { CreateTaskActionButton } from "@/components/catalyst-one/tasks/create-task-action-button";
import {
  EnterpriseWorkspaceLayout,
  EnterpriseWorkspaceHeaderBand,
  EnterpriseWorkflowStatusBand,
  WorkspaceIntelligenceRibbon,
} from "@/components/enterprise/workspace-layout";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import { buildJourneyBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { ApproxCibilScoreField } from "@/components/catalyst-one/shared/approx-cibil-score-field";
import { getApproxCibilScoreLabel } from "@/constants/cibil-score-master";
import { ExistingLoanInformationSection } from "@/components/catalyst-one/shared/existing-loan-information-section";
import { InvoicePartyField } from "@/components/catalyst-one/shared/commercial-payee-field";
import { EditDealDialog } from "@/components/catalyst-one/shared/edit-deal-dialog";
import {
  formatInvoicePartyDisplay,
  isInvoicePartyLocked,
  requiresInvoiceParty,
} from "@/lib/loan-commercial-payee";
import { LoanParticipantsTable } from "@/components/catalyst-one/shared/loan-participants-table";
import { LoanStructureCard } from "@/components/catalyst-one/shared/loan-structure-card";
import { LenderPipelineBoard } from "@/components/catalyst-one/execution/lender-pipeline-board";
import { MissionControlWorkspace } from "@/components/catalyst-one/mission-control/mission-control-workspace";
import { ChanakyaClosedLoopCoachingCard } from "@/components/catalyst-one/shared/chanakya-closed-loop-coaching-card";
import { DealDocumentsProjection } from "@/components/catalyst-one/deal-workspace/deal-documents-projection";
import { resolveLenderDocumentsKey } from "@/constants/lender-pipeline-documents";
import { TasksWorkspace } from "@/components/catalyst-one/execution/tasks-workspace";
import {
  buildDefaultParticipantEntityOptions,
  mapContactOptionsToParticipantEntities,
  resolveLoanParticipants,
  syncParticipantLegacyFields,
} from "@/lib/loan-participants";
import {
  getProductsForLendingType,
  isProductSecured,
  LENDING_TYPES,
  shouldShowFinalLoanAmount,
  TRANSACTION_TYPES,
} from "@/constants/loan-pipeline";
import { loanManagers } from "@/data/catalyst-one/loan-files";
import { isOccupancyApplicableToProduct, isOccupancyFieldVisible, getOccupancyLabel } from "@/constants/occupancy-master";
import { ROUTES } from "@/constants/routes";
import { runWithFeedback } from "@/lib/action-feedback";
import { isBusinessCompletionRequiredError } from "@/lib/business-completion";
import type {
  BusinessCompletionRequest,
  BusinessCompletionValues,
} from "@/types/business-completion";
import { BusinessCompletionDialog } from "@/components/catalyst-one/shared/business-completion";
import { PropertyInformationCard } from "@/components/catalyst-one/shared/property-information-card";
import { computeExpectedRevenueAmount } from "@/lib/financial-engine-revenue";
import { rememberOpportunityActiveLoan } from "@/lib/opportunity-loan-continuity";
import { getActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import {
  CanonicalJourneyHeader,
} from "@/components/catalyst-one/opportunity-workspace/opportunity-workspace-stage-rail";
import type { CanonicalJourneyStageId } from "@/constants/canonical-journey-header";
import { formatINR } from "@/lib/format-currency";
import { formatOpportunitySourceDisplay } from "@/constants/opportunity-business-source";
import { opportunityNumberForFile } from "@/lib/enterprise-credit-workspace";
import { updateDeal, updateDealAsync } from "@/lib/enterprise-deal/deal-data-access";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import { tracePipelineDrag } from "@/lib/enterprise-deal/pipeline-drag-trace";
import { isLoanWorkspaceDirty } from "@/lib/loan-workspace-dirty";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import type { PropertyType } from "@/constants/loan-stage-master";
import type { OccupancyMasterEntry } from "@/constants/occupancy-master";
import type { LoanParticipant } from "@/types/loan-participant";
import type {
  LendingType,
  LoanFile,
  LoanFilePriority,
  TransactionType,
} from "@/types/catalyst-one";
import { rememberMyDealsReturnState, readMyDealsReturnState } from "@/lib/my-deals/view-state";

export interface ContactOption {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
}

export interface LoanWorkspaceModalProps {
  file: LoanFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (fileId: string, patch: Partial<LoanFile>) => void;
  onOpenContact?: (contactId: string) => void;
  contactOptions?: ContactOption[];
  /** UX-03 — Initial workbench tab when opening workspace (e.g. documents after origination). */
  defaultTab?: string;
  /** @deprecated Use standard Dialog — customer workspace hides parent while loan is open. */
  embedded?: boolean;
}

/** CRC-005 / CRC-015 — Authoritative Loan Workspace. */
export function LoanWorkspaceModal(props: LoanWorkspaceModalProps) {
  const { open, file } = props;
  if (!open || !file) return null;
  return <LoanWorkspaceModalContent {...props} file={file} />;
}

function LoanWorkspaceModalContent({
  file,
  open,
  onOpenChange,
  onUpdate,
  onOpenContact,
  contactOptions = [],
  defaultTab = "lenders",
  embedded = false,
}: LoanWorkspaceModalProps & { file: LoanFile }) {
  const [draft, setDraft] = useState<LoanFile>(() => ({ ...file }));
  const [notes, setNotes] = useState(() => file.internalNotes);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab = tabFromUrl || defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [lenderAddOpen, setLenderAddOpen] = useState(false);
  const [editDealOpen, setEditDealOpen] = useState(false);
  /** BAT #23 — Documents tab lender deep-link from Lender Pipeline. */
  const [documentsLenderKey, setDocumentsLenderKey] = useState<string | null>(null);
  const [documentsPanelMode, setDocumentsPanelMode] = useState<"customer" | "lender">(
    "customer",
  );
  const [savedSnapshot, setSavedSnapshot] = useState<LoanFile>(() => ({ ...file }));
  const [overviewUi, setOverviewUi] = useState(() => ({
    loanDetails: { collapsed: false, mode: "view" as "view" | "edit" },
    propertyInfo: { collapsed: false, mode: "view" as "view" | "edit" },
    participants: { collapsed: false, mode: "view" as "view" | "edit" },
    source: { collapsed: false, mode: "view" as "view" | "edit" },
  }));
  const router = useRouter();
  const [focusParticipantId, setFocusParticipantId] = useState<string | null>(null);
  const opportunityId =
    searchParams.get("opportunityId") ?? getActiveOpportunityContext()?.opportunityId ?? null;
  const canonicalStage: CanonicalJourneyStageId =
    activeTab === "overview" ? "disbursed" : "lender_pipeline";
  const opportunityLabel =
    draft.opportunityNumber?.trim() || opportunityNumberForFile(draft);
  const dealLabel = draft.dealNumber?.trim() || null;
  const lenderLabel =
    draft.lenders?.find((l) => l.isPrimary)?.lender ||
    draft.lenders?.[0]?.lender ||
    draft.lender ||
    null;
  const identityLine = [
    dealLabel ? `Deal ${dealLabel}` : null,
    `Opportunity ${opportunityId || opportunityLabel}`,
    lenderLabel ? `Lender ${lenderLabel}` : null,
    draft.loanProduct,
    formatINR(draft.requiredAmount || draft.loanAmount),
  ]
    .filter(Boolean)
    .join(" · ");
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionRequest, setCompletionRequest] = useState<BusinessCompletionRequest | null>(
    null,
  );
  const pendingPersistRef = useRef<{
    exitOnSuccess?: boolean;
    workflowPatch?: Partial<LoanFile>;
    successMessage?: string;
    loadingLabel?: string;
  } | null>(null);

  useEffect(() => {
    if (opportunityId && file?.id) {
      rememberOpportunityActiveLoan(opportunityId, file.id);
    }
  }, [opportunityId, file?.id]);

  useEffect(() => {
    if (!file) return;
    setDraft((prev) => {
      // CO-ARCH-003 — Protect Pipeline / workspace draft across notify remounts.
      if (prev && prev.id === file.id && isLoanWorkspaceDirty(prev, file, notes)) {
        return prev;
      }
      const participants = resolveLoanParticipants(file);
      return { ...file, participants };
    });
  }, [file, notes]);

  // Reset chrome only when opening a different Deal (not on every notify).
  useEffect(() => {
    if (!file) return;
    const participants = resolveLoanParticipants(file);
    const next = { ...file, participants };
    setSavedSnapshot(next);
    setNotes(file.internalNotes);
    setActiveTab(tabFromUrl || defaultTab);
    setLenderAddOpen(false);
    setOverviewUi({
      loanDetails: { collapsed: false, mode: "view" },
      propertyInfo: { collapsed: false, mode: "view" },
      participants: { collapsed: false, mode: "view" },
      source: { collapsed: false, mode: "view" },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity-only reset
  }, [file?.id]);

  const { registryVersion } = useLoanJourneyEcm({ hydrateOnMount: true, refreshOnOpen: true, open });
  const participantEntityOptions = useMemo(() => {
    void registryVersion;
    const live = buildDefaultParticipantEntityOptions();
    if (contactOptions.length === 0) return live;
    const fromProp = mapContactOptionsToParticipantEntities(contactOptions);
    const byKey = new Map<string, (typeof live)[number]>();
    for (const row of [...fromProp, ...live]) {
      byKey.set(`${row.entityType}:${row.id}`, row);
    }
    return [...byKey.values()];
  }, [contactOptions, registryVersion]);

  const participants = draft.participants ?? [];

  const handleLoanStructureNavigate = (target: LoanStructureNavTarget) => {
    switch (target.type) {
      case "borrower":
      case "borrower_section":
      case "co_applicant":
      case "guarantor":
      case "property":
      case "income":
      case "banking":
        setActiveTab("overview");
        setOverviewUi((s) => ({
          ...s,
          participants: { ...s.participants, collapsed: false, mode: "view" },
        }));
        break;
      case "lender":
        setActiveTab("lenders");
        break;
      case "documents":
        setActiveTab("overview");
        break;
      case "timeline":
        setActiveTab("timeline");
        break;
      case "add":
        if (target.entity === "lender") setActiveTab("lenders");
        else {
          setActiveTab("overview");
          setOverviewUi((s) => ({
            ...s,
            participants: { ...s.participants, collapsed: false, mode: "edit" },
          }));
        }
        break;
      default:
        break;
    }
  };

  const lastUpdatedAt = useMemo(() => {
    const ts = draft.timeline?.[0]?.timestamp || draft.createdAt || draft.loginDate || draft.expectedDisbursement;
    const d = ts ? new Date(ts) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }, [draft.createdAt, draft.expectedDisbursement, draft.loginDate, draft.timeline]);

  const updatedBy = draft.relationshipManager || "—";

  const handleParticipantsChange = (next: LoanParticipant[]) => {
    const synced = syncParticipantLegacyFields(next, draft.businessDetails);
    patch(synced);
    if (draft) {
      syncLoanStructureRelationships({ ...draft, ...synced }, synced.participants);
    }
  };

  const hasUnsavedChanges = useMemo(
    () => isLoanWorkspaceDirty(draft, file, notes),
    [draft, file, notes],
  );

  const closeWorkspace = () => onOpenChange(false);

  const productOptions = getProductsForLendingType(draft.lendingType ?? "secured");
  // used in other tabs; kept for parity with existing calculations elsewhere
  shouldShowFinalLoanAmount(draft.stage);

  const patch = (p: Partial<LoanFile>) =>
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, ...p };
      if (p.lendingType) {
        const allowed = getProductsForLendingType(p.lendingType);
        if (!allowed.includes(next.loanProduct)) {
          next.loanProduct = allowed[0] ?? next.loanProduct;
        }
        if (!isProductSecured(next.loanProduct)) {
          next.propertyType = undefined;
          next.approxPropertyValue = undefined;
          next.occupancyId = undefined;
        } else if (
          !isOccupancyFieldVisible(next.loanProduct) ||
          (next.occupancyId &&
            !isOccupancyApplicableToProduct(next.occupancyId, next.loanProduct))
        ) {
          next.occupancyId = undefined;
        }
      }
      if (p.loanProduct && !isProductSecured(p.loanProduct)) {
        next.propertyType = undefined;
        next.approxPropertyValue = undefined;
        next.occupancyId = undefined;
      }
      if (
        p.loanProduct &&
        (!isOccupancyFieldVisible(p.loanProduct) ||
          (next.occupancyId &&
            !isOccupancyApplicableToProduct(next.occupancyId, p.loanProduct)))
      ) {
        next.occupancyId = undefined;
      }
      return next;
    });

  const buildPersistPayload = (): Partial<LoanFile> => {
    const synced = syncParticipantLegacyFields(participants, draft.businessDetails);
    return {
      ...draft,
      ...synced,
      internalNotes: notes,
      topUpRequested: draft.topUpRequired ? draft.topUpRequested : 0,
      expectedRevenue: computeExpectedRevenueAmount({
        ...draft,
        ...synced,
        internalNotes: notes,
      }),
    };
  };

  const persistDraft = async (options?: {
    exitOnSuccess?: boolean;
    workflowPatch?: Partial<LoanFile>;
    successMessage?: string;
    loadingLabel?: string;
    extraPatch?: Partial<LoanFile>;
  }): Promise<boolean> => {
    const {
      exitOnSuccess = false,
      workflowPatch,
      successMessage = "Loan updated successfully.",
      loadingLabel = workflowPatch ? "Updating workflow" : "Saving loan",
      extraPatch,
    } = options ?? {};

    setSaving(true);
    try {
      const updated = await runWithFeedback(
        loadingLabel,
        async () =>
          updateDeal(file.id, {
            ...buildPersistPayload(),
            ...extraPatch,
            ...workflowPatch,
          }, undefined, "loan_workspace"),
        { successMessage },
      );
      if (!updated) return false;
      setDraft(updated);
      setSavedSnapshot(updated);
      setNotes(updated.internalNotes);
      onUpdate?.(file.id, updated);
      if (exitOnSuccess) {
        const existing = readMyDealsReturnState();
        rememberMyDealsReturnState(existing ?? { view: "kanban", filterId: "my_deals" });
        onOpenChange(false);
        router.push(ROUTES.MY_DEALS);
      }
      return true;
    } catch (error) {
      if (isBusinessCompletionRequiredError(error)) {
        pendingPersistRef.current = {
          exitOnSuccess,
          workflowPatch,
          successMessage,
          loadingLabel,
        };
        setCompletionRequest(error.request);
        setCompletionOpen(true);
        return false;
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCompletionSaveAndContinue = async (values: BusinessCompletionValues) => {
    const completionPatch = businessCompletionValuesToLoanPatch(values);
    setDraft((d) => ({ ...d, ...completionPatch }));
    const pending = pendingPersistRef.current ?? {};
    pendingPersistRef.current = null;
    setCompletionOpen(false);
    setCompletionRequest(null);
    await persistDraft({
      ...pending,
      extraPatch: completionPatch,
      successMessage: pending.successMessage ?? "Loan updated successfully.",
    });
  };

  const handleSave = () => persistDraft();

  const handleSaveAndExit = () => persistDraft({ exitOnSuccess: true });

  const closeApi = useWorkspaceClose({
    onClose: closeWorkspace,
    hasUnsavedChanges,
    onSaveAndClose: () => persistDraft({ exitOnSuccess: false }),
    enableEscapeKey: false,
  });

  const setOverviewCardMode = (key: keyof typeof overviewUi, mode: "view" | "edit") => {
    setOverviewUi((s) => ({ ...s, [key]: { ...s[key], mode } }));
  };

  const toggleOverviewCardCollapsed = (key: keyof typeof overviewUi) => {
    setOverviewUi((s) => ({ ...s, [key]: { ...s[key], collapsed: !s[key].collapsed } }));
  };

  const cancelEdits = (key: keyof typeof overviewUi) => {
    setDraft(savedSnapshot);
    setNotes(savedSnapshot.internalNotes);
    setOverviewCardMode(key, "view");
  };

  const saveEdits = async (key: keyof typeof overviewUi, successMessage: string) => {
    const ok = await persistDraft({ successMessage });
    if (ok) setOverviewCardMode(key, "view");
  };

  const workbench = (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        activeTab === "lenders" || activeTab === "mission-control"
          ? "min-h-full px-2 py-2 sm:px-3"
          : "px-5 py-6 sm:px-6 lg:px-8 lg:py-8",
      )}
    >
          <TabsContent value="overview" className="mt-0 space-y-8">
            <ChanakyaClosedLoopCoachingCard
              loan={draft}
              saving={saving}
              onApplyPatch={async (patch) => {
                await persistDraft({
                  extraPatch: patch,
                  successMessage: "CHANAKYA coaching update saved.",
                  loadingLabel: "Updating from CHANAKYA coaching",
                });
              }}
            />

            <LoanWorkbenchSection title="Loan Details" description="Executive summary (read-first, edit-second).">
              <OverviewCardChrome
                mode={overviewUi.loanDetails.mode}
                collapsed={overviewUi.loanDetails.collapsed}
                onCollapse={() => toggleOverviewCardCollapsed("loanDetails")}
                onEdit={() => setOverviewCardMode("loanDetails", "edit")}
                onCancel={() => cancelEdits("loanDetails")}
                onSave={() => void saveEdits("loanDetails", "Loan details updated.")}
              />
              {!overviewUi.loanDetails.collapsed && (
                <>
                  {overviewUi.loanDetails.mode === "view" ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <SummaryItem label="Loan Number" value={draft.fileNumber} />
                      <SummaryItem label="Product" value={draft.loanProduct || "—"} />
                      <SummaryItem label="Product Type" value={draft.lendingType ? draft.lendingType.toUpperCase() : "—"} />
                      <SummaryItem label="Transaction Type" value={draft.transactionType ? draft.transactionType.toUpperCase() : "—"} />
                      {draft.transactionType === "balance_transfer" ? (
                        <>
                          <SummaryItem
                            label="Current Lending Institution"
                            value={draft.btInstitutionName || "—"}
                          />
                          <SummaryItem
                            label="Outstanding Loan Amount"
                            value={
                              draft.btAmount && draft.btAmount > 0
                                ? formatINR(draft.btAmount)
                                : "—"
                            }
                            accent
                          />
                        </>
                      ) : null}
                      <SummaryItem
                        label="Customer Type"
                        value={(participants.some((p) => p.entityType === "company") || Boolean(draft.businessDetails?.companyName)) ? "Business" : "Individual"}
                      />
                      <SummaryItem label="Required Amount" value={formatINR(draft.requiredAmount)} accent />
                      <SummaryItem
                        label="Approximate CIBIL Score"
                        value={getApproxCibilScoreLabel(draft.approxCibilScore)}
                      />
                      <SummaryItem label="Priority" value={draft.priority?.toUpperCase?.() ?? draft.priority} />
                      <SummaryItem label="RM" value={draft.relationshipManager || "—"} />
                      <SummaryItem
                        label="SOURCE"
                        value={formatOpportunitySourceDisplay(
                          draft.source,
                          draft.sourceContactName,
                        )}
                      />
                      <SummaryItem
                        label="Active lender cases"
                        value={String((draft.lenders ?? []).filter((l) => l.status === "active").length)}
                      />
                      <SummaryItem label="Login Date" value={new Date(draft.loginDate).toLocaleDateString("en-IN")} />
                      <SummaryItem label="Expected Login" value={new Date(draft.expectedLoginDate).toLocaleDateString("en-IN")} />
                      <SummaryItem
                        label="Invoice Party"
                        value={formatInvoicePartyDisplay(draft)}
                        accent={Boolean(
                          draft.invoicePartyId ?? draft.commissionAccountingPayeeId,
                        )}
                      />
                      <SummaryItem label="Expected Disbursement" value={new Date(draft.expectedDisbursement).toLocaleDateString("en-IN")} />
                      <SummaryItem label="Last Updated" value={lastUpdatedAt ? lastUpdatedAt.toLocaleString("en-IN") : "—"} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Product *">
                        <Select
                          value={draft.loanProduct}
                          onValueChange={(v) => {
                            const updates: Partial<LoanFile> = { loanProduct: v };
                            if (!isProductSecured(v)) {
                              updates.propertyType = undefined;
                              updates.approxPropertyValue = undefined;
                              updates.occupancyId = undefined;
                            } else if (
                              draft.occupancyId &&
                              !isOccupancyApplicableToProduct(draft.occupancyId, v)
                            ) {
                              updates.occupancyId = undefined;
                            }
                            patch(updates);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {productOptions.map((p) => (
                              <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Product Type *">
                        <Select
                          value={draft.lendingType ?? "secured"}
                          onValueChange={(v) => patch({ lendingType: v as LendingType })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LENDING_TYPES.map((t) => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Transaction Type *">
                        <Select
                          value={draft.transactionType ?? "fresh"}
                          onValueChange={(v) => {
                            const next = v as TransactionType;
                            if (next === "balance_transfer") {
                              patch({ transactionType: next });
                            } else {
                              patch({
                                transactionType: next,
                                btInstitutionId: undefined,
                                btInstitutionName: undefined,
                                btAmount: undefined,
                                topUpRequested: undefined,
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TRANSACTION_TYPES.map((t) => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="sm:col-span-2 lg:col-span-3">
                        <ExistingLoanInformationSection
                          visible={(draft.transactionType ?? "fresh") === "balance_transfer"}
                          institutionId={draft.btInstitutionId}
                          institutionName={draft.btInstitutionName}
                          outstandingAmount={draft.btAmount}
                          onInstitutionChange={(id, name) =>
                            patch({ btInstitutionId: id, btInstitutionName: name })
                          }
                          onOutstandingChange={(amount) =>
                            patch({
                              btAmount: amount,
                              topUpRequested:
                                typeof amount === "number"
                                  ? Math.max(0, (draft.requiredAmount ?? 0) - amount)
                                  : undefined,
                            })
                          }
                        />
                      </div>
                      <Field label="Required Amount (₹)">
                        <INRCurrencyInput value={draft.requiredAmount} onChange={(v) => patch({ requiredAmount: v ?? 0 })} />
                      </Field>
                      <ApproxCibilScoreField
                        value={draft.approxCibilScore}
                        onChange={(v) => patch({ approxCibilScore: v })}
                        required
                      />
                      <Field label="Priority">
                        <Select value={draft.priority} onValueChange={(v) => patch({ priority: v as LoanFilePriority })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["urgent", "high", "medium", "low"] as LoanFilePriority[]).map((p) => (
                              <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="RM">
                        <Select value={draft.relationshipManager} onValueChange={(v) => patch({ relationshipManager: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {loanManagers.map((m) => (
                              <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <InvoicePartyField
                        className="sm:col-span-2 lg:col-span-1"
                        invoicePartyId={draft.invoicePartyId ?? draft.commissionAccountingPayeeId}
                        invoicePartyLabel={
                          draft.invoicePartyLabel ??
                          draft.commissionAccountingPayeeLabel ??
                          draft.commercialPayeeSpecify
                        }
                        required={false}
                        readOnly={isInvoicePartyLocked(draft.stage, {
                          allowAuthorizedEdit: true,
                        })}
                        error={null}
                        hint={
                          requiresInvoiceParty(draft.stage) &&
                          !(draft.invoicePartyId ?? draft.commissionAccountingPayeeId)
                            ? "Accounting Ready: assign Invoice Party before invoice/commission actions — does not block Lender Pipeline."
                            : undefined
                        }
                        onChange={(next) =>
                          patch({
                            commercialPayee: next.commercialPayee,
                            commercialPayeeSpecify: next.commercialPayeeSpecify,
                            invoicePartyId:
                              next.invoicePartyId === null
                                ? undefined
                                : next.invoicePartyId ??
                                  next.commissionAccountingPayeeId ??
                                  draft.invoicePartyId,
                            invoicePartyLabel:
                              next.invoicePartyLabel === null
                                ? undefined
                                : next.invoicePartyLabel ??
                                  next.commissionAccountingPayeeLabel ??
                                  draft.invoicePartyLabel,
                            invoicePartyContactId:
                              next.invoicePartyContactId === null
                                ? undefined
                                : next.invoicePartyContactId ??
                                  next.commissionPayeeContactId ??
                                  draft.invoicePartyContactId,
                            commissionAccountingPayeeId:
                              next.invoicePartyId === null
                                ? undefined
                                : next.invoicePartyId ??
                                  next.commissionAccountingPayeeId ??
                                  draft.commissionAccountingPayeeId,
                            commissionAccountingPayeeLabel:
                              next.invoicePartyLabel === null
                                ? undefined
                                : next.invoicePartyLabel ??
                                  next.commissionAccountingPayeeLabel ??
                                  draft.commissionAccountingPayeeLabel,
                            commissionPayeeContactId:
                              next.invoicePartyContactId === null
                                ? undefined
                                : next.invoicePartyContactId ??
                                  next.commissionPayeeContactId ??
                                  draft.commissionPayeeContactId,
                          })
                        }
                      />
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Audit: Updated By {updatedBy}</span>
                    <span>•</span>
                    <span>Updated Date {lastUpdatedAt ? lastUpdatedAt.toLocaleString("en-IN") : "—"}</span>
                  </div>
                </>
              )}
            </LoanWorkbenchSection>

            <LoanWorkbenchSection
              title="Participant Details"
              description="Edit contacts, income, employment, documents and KYC from the Loan Structure map."
            >
              <LoanStructureCard
                file={draft}
                participants={participants}
                readOnly={overviewUi.participants.mode === "view"}
                onSelectPrimary={() => {
                  setOverviewUi((s) => ({
                    ...s,
                    participants: { collapsed: false, mode: "edit" },
                  }));
                  setFocusParticipantId(null);
                  if (onOpenContact && draft.customerId) onOpenContact(draft.customerId);
                }}
                onSelectParticipant={(participantId) => {
                  setOverviewUi((s) => ({
                    ...s,
                    participants: { collapsed: false, mode: "edit" },
                  }));
                  setFocusParticipantId(participantId);
                }}
                onPrimaryOwnershipChange={(ownership) => patch(ownership)}
                onParticipantOwnershipChange={(participantId, ownershipPatch) => {
                  handleParticipantsChange(
                    participants.map((p) =>
                      p.id === participantId ? { ...p, ...ownershipPatch } : p,
                    ),
                  );
                }}
              />
              <OverviewCardChrome
                mode={overviewUi.participants.mode}
                collapsed={overviewUi.participants.collapsed}
                onCollapse={() => toggleOverviewCardCollapsed("participants")}
                onEdit={() => setOverviewCardMode("participants", "edit")}
                onCancel={() => cancelEdits("participants")}
                onSave={() => void saveEdits("participants", "Participants updated.")}
              />
              {!overviewUi.participants.collapsed && (
              <LoanParticipantsTable
                primaryApplicant={{
                  id: draft.customerId,
                  name: draft.customerName,
                  mobile: draft.customerMobile,
                  email: draft.customerEmail,
                  city: draft.city,
                  employmentType: draft.employmentType,
                }}
                participants={participants}
                entityOptions={participantEntityOptions}
                onChange={handleParticipantsChange}
                readOnly={overviewUi.participants.mode === "view"}
                focusParticipantId={focusParticipantId}
                onTimeline={(note) =>
                  patch({
                    timeline: [
                      {
                        id: `tl-participant-${Date.now()}`,
                        title: "Participants",
                        description: note,
                        timestamp: new Date().toISOString(),
                        completed: true,
                      },
                      ...draft.timeline,
                    ],
                  })
                }
                onOpenEntity={
                  onOpenContact
                    ? (entityId, entityType) => {
                        if (entityType === "individual") onOpenContact(entityId);
                      }
                    : undefined
                }
              />
              )}
              {!overviewUi.participants.collapsed && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Audit: Updated By {updatedBy}</span>
                  <span>•</span>
                  <span>Updated Date {lastUpdatedAt ? lastUpdatedAt.toLocaleString("en-IN") : "—"}</span>
                </div>
              )}
            </LoanWorkbenchSection>

            <LoanWorkbenchSection title="Source Details" description="Locked after loan creation (read-only).">
              <OverviewCardChrome
                lockedLabel="🔒 Read Only"
                mode="view"
                collapsed={overviewUi.source.collapsed}
                onCollapse={() => toggleOverviewCardCollapsed("source")}
              />
              {!overviewUi.source.collapsed && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <SummaryItem
                      label="SOURCE"
                      value={formatOpportunitySourceDisplay(
                        draft.source,
                        draft.sourceContactName,
                      )}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Audit: Updated By {updatedBy}</span>
                    <span>•</span>
                    <span>Updated Date {lastUpdatedAt ? lastUpdatedAt.toLocaleString("en-IN") : "—"}</span>
                  </div>
                </>
              )}
            </LoanWorkbenchSection>

            {isProductSecured(draft.loanProduct) && (
              <LoanWorkbenchSection
                title="Property Information"
                description="Required for secured products — complete once, reuse across the journey."
              >
                <OverviewCardChrome
                  mode={overviewUi.propertyInfo.mode}
                  collapsed={overviewUi.propertyInfo.collapsed}
                  onCollapse={() => toggleOverviewCardCollapsed("propertyInfo")}
                  onEdit={() => setOverviewCardMode("propertyInfo", "edit")}
                  onCancel={() => cancelEdits("propertyInfo")}
                  onSave={() => void saveEdits("propertyInfo", "Property information updated.")}
                />
                {!overviewUi.propertyInfo.collapsed && (
                  <>
                    {overviewUi.propertyInfo.mode === "view" ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <SummaryItem label="Property Type" value={draft.propertyType || "—"} />
                        {isOccupancyFieldVisible(draft.loanProduct) && (
                          <SummaryItem
                            label="Property Occupancy"
                            value={getOccupancyLabel(draft.occupancyId) || "—"}
                          />
                        )}
                        <SummaryItem
                          label="Approx. Property Value"
                          value={
                            draft.approxPropertyValue
                              ? formatINR(draft.approxPropertyValue)
                              : "—"
                          }
                        />
                      </div>
                    ) : (
                      <PropertyInformationCard
                        loanProduct={draft.loanProduct}
                        values={{
                          propertyType: draft.propertyType,
                          occupancyId: draft.occupancyId,
                          approxPropertyValue: draft.approxPropertyValue,
                        }}
                        onPropertyTypeChange={(type: PropertyType) =>
                          patch({ propertyType: type })
                        }
                        onOccupancyChange={(entry: OccupancyMasterEntry) =>
                          patch({ occupancyId: entry.id })
                        }
                        onApproxPropertyValueChange={(value) =>
                          patch({ approxPropertyValue: value })
                        }
                      />
                    )}
                  </>
                )}
              </LoanWorkbenchSection>
            )}

            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
              <p className="text-[11px] text-muted-foreground">
                Pipeline status lives in the Workflow Status Bar above. Use Lender Pipeline for execution.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-2 h-8 text-xs"
                onClick={() => setActiveTab("lenders")}
              >
                Open Lender Pipeline
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="lenders" className="mt-0 min-h-[min(78vh,900px)] flex-1">
            <LenderPipelineBoard
              context={{
                dealId: draft.enterpriseDealId || draft.id,
                dealNumber: draft.dealNumber || draft.fileNumber || draft.id,
                opportunityId: draft.enterpriseOpportunityId,
                opportunityNumber: draft.opportunityNumber,
                requiredAmount: draft.requiredAmount ?? draft.loanAmount ?? 0,
                interestRate: draft.interestRate,
                tenure: draft.tenure,
                loanProduct: draft.loanProduct || "",
                productCode: draft.productCode,
                relationshipManager: draft.relationshipManager || "",
                customerName: draft.customerName || "",
                customerId: draft.customerId,
                invoicePartyId: draft.invoicePartyId,
                commissionAccountingPayeeId: draft.commissionAccountingPayeeId,
                commercialPayee: draft.commercialPayee,
                commercialPayeeSpecify: draft.commercialPayeeSpecify,
                rowVersion: 0,
              }}
              cases={draft.lenders ?? []}
              updatedBy={draft.relationshipManager}
              addOpen={lenderAddOpen}
              onAddOpenChange={setLenderAddOpen}
              onRemoveDeal={async (dealId, card) => {
                // CO-QA-002 Round 3 — Registry soft-delete first; UI only after confirmation.
                tracePipelineDrag("delete_initiated", {
                  dealId,
                  opportunityId: draft.enterpriseOpportunityId,
                  surface: "loan_workspace_modal",
                });
                tracePipelineDrag("delete_api_called", {
                  dealId,
                  reason: "kanban_pipeline_remove",
                  method: "DELETE",
                  path: `/api/enterprise-deals/${dealId}`,
                });
                const deleted = await enterpriseDealApiClient.softDeleteDeal(
                  dealId,
                  "kanban_pipeline_remove",
                );
                if (!deleted.isDeleted) {
                  tracePipelineDrag("delete_failed", {
                    dealId,
                    message: "DELETE returned Deal without isDeleted=true",
                  });
                  throw new Error(
                    "Deal delete did not persist (isDeleted is still false).",
                  );
                }
                tracePipelineDrag("delete_db_confirmed", {
                  dealId,
                  dealNumber: deleted.dealNumber,
                  isDeleted: deleted.isDeleted,
                });

                const opportunityId = draft.enterpriseOpportunityId?.trim();
                if (opportunityId) {
                  try {
                    const { removeStrategicShortlistItem } = await import(
                      "@/lib/strategic-lender-pipeline"
                    );
                    const lenderRef =
                      card.lenderRef ||
                      (deleted.lenderId ? `lender:${deleted.lenderId}` : null) ||
                      deleted.primaryCounterpartyName ||
                      card.lender ||
                      dealId;
                    removeStrategicShortlistItem(opportunityId, lenderRef);
                  } catch {
                    /* shortlist prune best-effort */
                  }

                  const { items } = await enterpriseDealApiClient.listDealsByOpportunity(
                    opportunityId,
                  );
                  if (items.some((d) => d.id === dealId)) {
                    tracePipelineDrag("delete_failed", {
                      dealId,
                      message: "Deleted Deal still returned by listDealsByOpportunity",
                    });
                    throw new Error(
                      "Deleted Deal reappeared after Registry reload. Soft-delete did not stick.",
                    );
                  }
                  tracePipelineDrag("delete_pipeline_refreshed", {
                    dealId,
                    remaining: items.length,
                  });
                }

                const next = (draft.lenders ?? []).filter((c) => {
                  const id = (c.enterpriseDealId || c.id || "").trim();
                  return id !== dealId;
                });
                patch({ lenders: next });
                setSavedSnapshot((s) => (s ? { ...s, lenders: next } : s));
                toast.success("Lender deal deleted.");
                tracePipelineDrag("delete_registry_refreshed", {
                  dealId,
                  remaining: next.length,
                });
                tracePipelineDrag("delete_render_complete", {
                  dealId,
                  remaining: next.length,
                });
              }}
              onChange={(next) => {
                tracePipelineDrag("context_patch", {
                  fileId: draft?.id,
                  lenders: next.map((l) => `${l.id}:${l.caseStage}`),
                });
                patch({ lenders: next });
                // Prefer Deal Registry when Deal id is known; never Soft Go-Live for Deal path.
                const dealKey = draft.enterpriseDealId || draft.id;
                if (dealKey) {
                  tracePipelineDrag("persist_start", { fileId: dealKey });
                  void updateDealAsync(
                    dealKey,
                    { lenders: next },
                    undefined,
                    "loan_workspace",
                  ).then((persisted) => {
                    if (persisted) {
                      tracePipelineDrag("persist_registry", {
                        fileId: persisted.id,
                        enterpriseDealId: persisted.enterpriseDealId,
                      });
                      setSavedSnapshot((s) =>
                        s ? { ...s, lenders: next, lender: persisted.lender } : s,
                      );
                    } else {
                      tracePipelineDrag("error", {
                        phase: "persist_registry",
                        reason: "updateDealAsync_failed",
                        fileId: draft.id,
                      });
                      toast.error(
                        "Could not persist lender stage to Enterprise Deal Registry. Retry the drag.",
                      );
                    }
                  });
                }
              }}
              onCommercialPayeeChange={(next) => patch(next)}
              onOpenLenderDocuments={(c) => {
                setDocumentsLenderKey(resolveLenderDocumentsKey(c));
                setDocumentsPanelMode("lender");
                setActiveTab("documents");
              }}
              onTimeline={(note) =>
                patch({
                  timeline: [
                    {
                      id: `tl-lender-${Date.now()}`,
                      title: "Lender Pipeline",
                      description: note,
                      timestamp: new Date().toISOString(),
                      completed: true,
                    },
                    ...draft.timeline,
                  ],
                })
              }
            />
          </TabsContent>

          <TabsContent value="mission-control" className="mt-0 flex min-h-0 flex-1 flex-col">
            <MissionControlWorkspace loan={draft} cases={draft.lenders ?? []} />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <LoanWorkbenchSection
              title="Documents"
              description="Document Review & Lender Documents — same registry as Opportunity Document Center."
            >
              <DealDocumentsProjection
                file={draft}
                opportunityId={draft.enterpriseOpportunityId || null}
                initialMode={documentsPanelMode}
                initialLenderId={documentsLenderKey}
              />
            </LoanWorkbenchSection>
          </TabsContent>

          <TabsContent value="tasks" className="mt-0">
            <LoanWorkbenchSection title="Tasks" description="Operational tasks assigned to this file.">
              <TasksWorkspace
                tasks={draft.tasks}
                updatedBy={draft.relationshipManager}
                onChange={(next) => patch({ tasks: next })}
                onTimeline={(note) =>
                  patch({
                    timeline: [
                      {
                        id: `tl-task-${Date.now()}`,
                        title: "Task Activity",
                        description: note,
                        timestamp: new Date().toISOString(),
                        completed: true,
                      },
                      ...draft.timeline,
                    ],
                  })
                }
              />
            </LoanWorkbenchSection>
          </TabsContent>

          <TabsContent value="timeline" className="mt-0">
            <LoanWorkbenchSection title="Timeline" description="Chronological activity across the loan journey.">
              <FileTimeline events={draft.timeline} />
            </LoanWorkbenchSection>
          </TabsContent>

          <TabsContent value="notes" className="mt-0">
            <LoanWorkbenchSection
              title="Business Notes"
              description="Official enterprise notes for this deal — activity history & business context."
            >
              <EnterpriseBusinessNotesPanel
                context={{
                  workspaceKind: "lender_lifecycle",
                  entityKind: "deal",
                  entityId: draft.enterpriseDealId ?? draft.id,
                  dealId: draft.enterpriseDealId ?? draft.id,
                  opportunityId:
                    opportunityId ?? draft.enterpriseOpportunityId ?? null,
                  contactId: draft.sourceContactId ?? null,
                  lenderName: draft.lender || null,
                }}
                query={{
                  dealId: draft.enterpriseDealId ?? draft.id,
                  entityKind: "deal",
                  entityId: draft.enterpriseDealId ?? draft.id,
                }}
              />
            </LoanWorkbenchSection>
          </TabsContent>
    </div>
  );

  const body = (
    <Tabs
      key={draft.id}
      value={activeTab}
      onValueChange={setActiveTab}
      className="flex min-h-0 flex-1 flex-col"
    >
      <EnterpriseWorkspaceLayout
        workspaceHeader={
          <>
            <WorkspaceExitNav
              breadcrumbs={buildJourneyBreadcrumbs("loan_workspace")}
            />
            <EnterpriseWorkspaceHeaderBand
            identity={
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground sm:text-base">
                  {draft.customerName}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{identityLine}</p>
              </div>
            }
            actions={
              <>
                <BusinessNotesActionButton
                  context={{
                    workspaceKind: "lender_lifecycle",
                    entityKind: "deal",
                    entityId: draft.enterpriseDealId ?? draft.id,
                    dealId: draft.enterpriseDealId ?? draft.id,
                    opportunityId:
                      opportunityId ?? draft.enterpriseOpportunityId ?? null,
                    contactId: draft.sourceContactId ?? null,
                    lenderName: draft.lender || null,
                  }}
                />
                <CreateTaskActionButton
                  context={{
                    dealId: draft.enterpriseDealId ?? draft.id,
                    fileId: draft.id,
                    opportunityId: opportunityId ?? draft.enterpriseOpportunityId ?? null,
                    contactId: draft.sourceContactId ?? null,
                    borrowerName: draft.customerName,
                    loanProduct: draft.loanProduct,
                    lenderName: draft.lender || null,
                  }}
                />
                <LoanStructureCommandControl
                  file={draft}
                  participants={participants}
                  onNavigate={handleLoanStructureNavigate}
                  onOpenContact={onOpenContact}
                  onParticipantsChange={handleParticipantsChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setEditDealOpen(true)}
                  title="Edit Deal — lender, program, amount, Invoice Party"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Edit Deal
                </Button>
                <LoanActionCenter
                  loan={draft}
                  onDocumentsChange={(documents) => patch({ documents })}
                  onTimelineNote={(title, description) =>
                    patch({
                      timeline: [
                        {
                          id: `tl-${Date.now()}`,
                          title,
                          description,
                          timestamp: new Date().toISOString(),
                          completed: true,
                        },
                        ...draft.timeline,
                      ],
                    })
                  }
                />
                <WorkspacePrimaryActions
                  mode="editable"
                  onClose={closeApi.requestClose}
                  onSave={async () => {
                    await handleSave();
                  }}
                  onMyDeals={async () => {
                    await handleSaveAndExit();
                  }}
                  saving={saving || closeApi.saving}
                  density="compact"
                />
              </>
            }
            journey={
              <CanonicalJourneyHeader
                currentStage={canonicalStage}
                fileId={draft.id}
                opportunityId={opportunityId}
                customerName={draft.customerName}
                product={draft.loanProduct}
                label={opportunityLabel}
              />
            }
          />
          </>
        }
        workflowStatus={
          <EnterpriseWorkflowStatusBand>
            <WorkspaceIntelligenceRibbon loan={draft} />
          </EnterpriseWorkflowStatusBand>
        }
        navigation={
          <div className="flex items-center gap-2 border-b border-border/60 bg-background px-3 py-1 sm:px-4">
            <TabsList className="grid h-auto flex-1 grid-cols-7 bg-muted/80 p-0.5">
              <TabsTrigger value="overview" className="h-7 text-[11px]">
                Overview
              </TabsTrigger>
              <TabsTrigger value="lenders" className="h-7 text-[11px]">
                Lender Pipeline
              </TabsTrigger>
              <TabsTrigger value="mission-control" className="h-7 text-[11px]">
                Mission Control
              </TabsTrigger>
              <TabsTrigger value="documents" className="h-7 text-[11px]">
                Documents
              </TabsTrigger>
              <TabsTrigger value="tasks" className="h-7 text-[11px]">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="timeline" className="h-7 text-[11px]">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes" className="h-7 text-[11px]">
                Notes
              </TabsTrigger>
            </TabsList>
            <Button
              type="button"
              size="sm"
              className="h-7 shrink-0 text-[11px]"
              onClick={() => {
                setActiveTab("lenders");
                setLenderAddOpen(true);
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              {(draft.lenders ?? []).length > 0 ? "Identify Additional Lender" : "Identify Lender"}
            </Button>
          </div>
        }
      >
        <LoanWorkbenchLayout workbench={workbench} />
      </EnterpriseWorkspaceLayout>
      <UnsavedChangesDialog
        open={closeApi.confirmOpen}
        onOpenChange={closeApi.setConfirmOpen}
        onDiscard={closeApi.handleDiscard}
        onSaveAndClose={closeApi.handleSaveAndClose}
        saving={closeApi.saving}
      />
      <IntelligentPayeeCaptureHost
        file={draft}
        onUpdateFile={(payeePatch) => {
          patch(payeePatch);
        }}
      />
      <EditDealDialog
        open={editDealOpen}
        onOpenChange={setEditDealOpen}
        draft={draft}
        onSaved={async ({ patch: dealPatch, auditHint }) => {
          const nextTimeline = auditHint
            ? [
                {
                  id: `tl-${Date.now()}`,
                  title: "Deal edited",
                  description: auditHint,
                  timestamp: new Date().toISOString(),
                  completed: true,
                },
                ...draft.timeline,
              ]
            : draft.timeline;
          if (dealPatch.internalNotes != null) setNotes(dealPatch.internalNotes);
          await persistDraft({
            workflowPatch: { ...dealPatch, timeline: nextTimeline },
            successMessage: "Deal changes saved.",
          });
        }}
      />
    </Tabs>
  );

  if (embedded) {
    return (
      <>
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex h-[85vh] max-h-[85vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
            {body}
          </div>
        </div>
        <BusinessCompletionDialog
          open={completionOpen}
          request={completionRequest}
          contextValues={{
            loanProduct: draft.loanProduct,
            lendingType: draft.lendingType,
            propertyType: draft.propertyType,
            occupancyId: draft.occupancyId,
            btInstitutionId: draft.btInstitutionId,
            btAmount: draft.btAmount,
            finalLoanAmount: draft.finalLoanAmount,
            transactionType: draft.transactionType,
            commercialPayee: draft.commercialPayee,
            commercialPayeeSpecify: draft.commercialPayeeSpecify,
          }}
          saving={saving}
          onOpenChange={(open) => {
            setCompletionOpen(open);
            if (!open) {
              pendingPersistRef.current = null;
              setCompletionRequest(null);
            }
          }}
          onSaveAndContinue={handleCompletionSaveAndContinue}
        />
      </>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else closeApi.requestClose();
        }}
      >
        <DialogContent className="flex h-[94vh] max-h-[94vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden rounded-xl p-0 [&>button]:hidden">
          {body}
        </DialogContent>
      </Dialog>
      <BusinessCompletionDialog
        open={completionOpen}
        request={completionRequest}
        contextValues={{
          loanProduct: draft.loanProduct,
          lendingType: draft.lendingType,
          propertyType: draft.propertyType,
          occupancyId: draft.occupancyId,
          btInstitutionId: draft.btInstitutionId,
          btAmount: draft.btAmount,
          finalLoanAmount: draft.finalLoanAmount,
          transactionType: draft.transactionType,
          commercialPayee: draft.commercialPayee,
          commercialPayeeSpecify: draft.commercialPayeeSpecify,
        }}
        saving={saving}
        onOpenChange={(open) => {
          setCompletionOpen(open);
          if (!open) {
            pendingPersistRef.current = null;
            setCompletionRequest(null);
          }
        }}
        onSaveAndContinue={handleCompletionSaveAndContinue}
      />
    </>
  );
}

function businessCompletionValuesToLoanPatch(
  values: BusinessCompletionValues,
): Partial<LoanFile> {
  const patch: Partial<LoanFile> = {};
  if (values.lendingType !== undefined) patch.lendingType = values.lendingType as LendingType;
  if (values.transactionType !== undefined) {
    patch.transactionType = values.transactionType as TransactionType;
  }
  if (values.loanProduct !== undefined) patch.loanProduct = String(values.loanProduct);
  if (values.propertyType !== undefined) patch.propertyType = String(values.propertyType);
  if (values.occupancyId !== undefined) patch.occupancyId = String(values.occupancyId);
  if (values.btInstitutionId !== undefined) {
    patch.btInstitutionId = String(values.btInstitutionId);
  }
  if (values.btInstitutionName !== undefined) {
    patch.btInstitutionName = String(values.btInstitutionName);
  }
  if (values.btAmount !== undefined && values.btAmount !== null && values.btAmount !== "") {
    patch.btAmount = Number(values.btAmount);
  }
  if (
    values.finalLoanAmount !== undefined &&
    values.finalLoanAmount !== null &&
    values.finalLoanAmount !== ""
  ) {
    patch.finalLoanAmount = Number(values.finalLoanAmount);
  }
  if (values.commercialPayee !== undefined && values.commercialPayee !== null && values.commercialPayee !== "") {
    patch.commercialPayee = values.commercialPayee as LoanFile["commercialPayee"];
  }
  if (values.commercialPayeeSpecify !== undefined) {
    patch.commercialPayeeSpecify =
      values.commercialPayeeSpecify === "" || values.commercialPayeeSpecify === null
        ? undefined
        : String(values.commercialPayeeSpecify);
  }
  if (values.commissionPayeeContactId !== undefined) {
    patch.commissionPayeeContactId =
      values.commissionPayeeContactId === "" || values.commissionPayeeContactId === null
        ? undefined
        : String(values.commissionPayeeContactId);
  }
  if (values.commissionAccountingPayeeId !== undefined) {
    patch.commissionAccountingPayeeId =
      values.commissionAccountingPayeeId === "" ||
      values.commissionAccountingPayeeId === null
        ? undefined
        : String(values.commissionAccountingPayeeId);
    patch.invoicePartyId = patch.commissionAccountingPayeeId;
  }
  if (values.invoicePartyId !== undefined) {
    patch.invoicePartyId =
      values.invoicePartyId === "" || values.invoicePartyId === null
        ? undefined
        : String(values.invoicePartyId);
    patch.commissionAccountingPayeeId = patch.invoicePartyId;
  }
  if (values.commissionAccountingPayeeLabel !== undefined) {
    patch.commissionAccountingPayeeLabel =
      values.commissionAccountingPayeeLabel === "" ||
      values.commissionAccountingPayeeLabel === null
        ? undefined
        : String(values.commissionAccountingPayeeLabel);
    patch.invoicePartyLabel = patch.commissionAccountingPayeeLabel;
  }
  if (values.invoicePartyLabel !== undefined) {
    patch.invoicePartyLabel =
      values.invoicePartyLabel === "" || values.invoicePartyLabel === null
        ? undefined
        : String(values.invoicePartyLabel);
    patch.commissionAccountingPayeeLabel = patch.invoicePartyLabel;
  }
  return patch;
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-medium mt-0.5", accent && "text-success font-semibold")}>
        {value}
      </p>
    </div>
  );
}

function OverviewCardChrome({
  mode,
  collapsed,
  lockedLabel,
  onEdit,
  onSave,
  onCancel,
  onCollapse,
}: {
  mode: "view" | "edit";
  collapsed: boolean;
  lockedLabel?: string;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onCollapse: () => void;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[10px] text-muted-foreground">
        {lockedLabel ? <span className="font-medium">{lockedLabel}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!lockedLabel && mode === "view" && onEdit && (
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onEdit}>
            Edit
          </Button>
        )}
        {!lockedLabel && mode === "edit" && (
          <>
            {onSave && (
              <Button type="button" size="sm" className="h-8 text-xs" onClick={onSave}>
                Save
              </Button>
            )}
            {onCancel && (
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </>
        )}
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onCollapse}>
          {collapsed ? "Expand" : "Collapse"}
        </Button>
      </div>
    </div>
  );
}
