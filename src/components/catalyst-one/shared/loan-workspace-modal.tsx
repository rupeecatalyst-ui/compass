"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { FileTimeline } from "@/components/catalyst-one/loan-files/file-timeline";
import { LoanWorkbenchLayout } from "@/components/catalyst-one/shared/loan-workbench-layout";
import { LoanWorkbenchSection } from "@/components/catalyst-one/shared/loan-workbench-section";
import { UnsavedChangesDialog } from "@/components/catalyst-one/shared/unsaved-changes-dialog";
import { WorkspacePrimaryActions } from "@/components/catalyst-one/shared/workspace-primary-actions";
import { LoanStructureCommandControl } from "@/components/catalyst-one/shared/loan-structure-drawer";
import type { LoanStructureNavTarget } from "@/lib/loan-structure";
import { useLoanJourneyEcm } from "@/hooks/use-loan-journey-ecm";
import { LoanActionCenter } from "@/components/catalyst-one/action-center";
import {
  EnterpriseWorkspaceLayout,
  EnterpriseWorkspaceHeaderBand,
  EnterpriseWorkflowStatusBand,
  WorkspaceIntelligenceRibbon,
} from "@/components/enterprise/workspace-layout";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { ApproxCibilScoreField } from "@/components/catalyst-one/shared/approx-cibil-score-field";
import { getApproxCibilScoreLabel } from "@/constants/cibil-score-master";
import { ExistingLoanInformationSection } from "@/components/catalyst-one/shared/existing-loan-information-section";
import { LoanParticipantsTable } from "@/components/catalyst-one/shared/loan-participants-table";
import { LoanStructureCard } from "@/components/catalyst-one/shared/loan-structure-card";
import { LenderPipelineBoard } from "@/components/catalyst-one/execution/lender-pipeline-board";
import { MissionControlWorkspace } from "@/components/catalyst-one/mission-control/mission-control-workspace";
import { ChanakyaClosedLoopCoachingCard } from "@/components/catalyst-one/shared/chanakya-closed-loop-coaching-card";
import { DocumentsWorkspace } from "@/components/catalyst-one/execution/documents-workspace";
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
import { LOAN_FILE_PRIORITY_STYLES } from "@/constants/loan-status";
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
import {
  buildBusinessJourneyHref,
  getBusinessBackLabel,
  getBusinessJourneyNavStep,
  resolveLoanWorkspaceContinue,
} from "@/constants/enterprise-business-journey-navigation";
import {
  loanTabToNavigatorStageId,
} from "@/constants/enterprise-business-journey-navigator";
import { getActiveOpportunityContext } from "@/lib/lead-opportunity-journey/active-context";
import {
  BusinessJourneyNavigator,
  BusinessTransitionCard,
} from "@/components/catalyst-one/business-journey-navigator";
import { formatINR } from "@/lib/format-currency";
import { updateLoanFileInStorage } from "@/lib/loan-files-utils";
import { isLoanWorkspaceDirty } from "@/lib/loan-workspace-dirty";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
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
  const journeyCtx = { fileId: draft.id, opportunityId };
  const backToCreditHref = buildBusinessJourneyHref(
    getBusinessJourneyNavStep("credit_workbench"),
    journeyCtx,
  );
  const hasActiveLenderCases = (draft.lenders ?? []).length > 0;
  const loanContinue = resolveLoanWorkspaceContinue({
    activeTab,
    hasActiveLenderCases,
  });
  const navigatorStageId = loanTabToNavigatorStageId(activeTab);
  const backLabel =
    activeTab === "lenders"
      ? "Back to Loan Workspace"
      : activeTab === "timeline" || activeTab === "tasks"
        ? "Back to Lender Pipeline"
        : getBusinessBackLabel(getBusinessJourneyNavStep("credit_workbench"));
  const handleJourneyBack = () => {
    if (activeTab === "lenders" || activeTab === "timeline" || activeTab === "tasks") {
      setActiveTab(activeTab === "lenders" ? "overview" : "lenders");
      return;
    }
    router.push(backToCreditHref);
  };
  const handleJourneyContinue = () => {
    if (loanContinue.navId === "lender_pipeline") {
      setActiveTab("lenders");
      return;
    }
    router.push(
      buildBusinessJourneyHref(getBusinessJourneyNavStep(loanContinue.navId), journeyCtx),
    );
  };
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
    if (file) {
      const participants = resolveLoanParticipants(file);
      const next = { ...file, participants };
      setDraft(next);
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
    }
  }, [file, defaultTab, tabFromUrl]);

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
          updateLoanFileInStorage(file.id, {
            ...buildPersistPayload(),
            ...extraPatch,
            ...workflowPatch,
          }),
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
                        label="Active lender cases"
                        value={String((draft.lenders ?? []).filter((l) => l.status === "active").length)}
                      />
                      <SummaryItem label="Login Date" value={new Date(draft.loginDate).toLocaleDateString("en-IN")} />
                      <SummaryItem label="Expected Login" value={new Date(draft.expectedLoginDate).toLocaleDateString("en-IN")} />
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
                    <SummaryItem label="Source" value={draft.source ?? "—"} />
                    <SummaryItem label="Source Contact" value={draft.sourceContactName ?? "—"} />
                    <SummaryItem label="Lead Origin" value={draft.source ?? "—"} />
                    <SummaryItem
                      label="Referral"
                      value={(draft.source ?? "").toLowerCase().includes("ref") ? (draft.sourceContactName ?? "—") : "—"}
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

          <TabsContent value="lenders" className="mt-0 min-h-[min(72vh,820px)] flex-1">
            <LenderPipelineBoard
              loan={draft}
              cases={draft.lenders ?? []}
              updatedBy={draft.relationshipManager}
              addOpen={lenderAddOpen}
              onAddOpenChange={setLenderAddOpen}
              onChange={(next) => patch({ lenders: next })}
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
            <LoanWorkbenchSection title="Documents" description="Checklist and collection status for this loan file.">
              <DocumentsWorkspace
                documents={draft.documents}
                updatedBy={draft.relationshipManager}
                onChange={(next) => patch({ documents: next })}
                onTimeline={(note) =>
                  patch({
                    timeline: [
                      {
                        id: `tl-doc-${Date.now()}`,
                        title: "Document Activity",
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
          <EnterpriseWorkspaceHeaderBand
            identity={
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg">
                  {draft.customerName}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">{draft.fileNumber}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{formatINR(draft.requiredAmount)}</span>
                  <span aria-hidden>·</span>
                  <span>RM {draft.relationshipManager}</span>
                  <span aria-hidden>·</span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 capitalize",
                      LOAN_FILE_PRIORITY_STYLES[draft.priority].className,
                    )}
                  >
                    {draft.priority}
                  </span>
                </div>
              </div>
            }
            actions={
              <>
                <LoanStructureCommandControl
                  file={draft}
                  participants={participants}
                  onNavigate={handleLoanStructureNavigate}
                />
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
                <BusinessTransitionCard
                  continueLabel={loanContinue.label}
                  onContinue={handleJourneyContinue}
                  backLabel={backLabel}
                  onBack={handleJourneyBack}
                />
                <WorkspacePrimaryActions
                  mode="editable"
                  onClose={closeApi.requestClose}
                  onSave={async () => {
                    await handleSave();
                  }}
                  onSaveAndExit={async () => {
                    await handleSaveAndExit();
                  }}
                  saving={saving || closeApi.saving}
                  density="compact"
                />
              </>
            }
            journey={
              <BusinessJourneyNavigator
                currentStageId={navigatorStageId}
                fileId={draft.id}
                opportunityId={opportunityId}
                hideHelperCaptions
                density="compact"
              />
            }
          />
        }
        workflowStatus={
          <EnterpriseWorkflowStatusBand>
            <WorkspaceIntelligenceRibbon loan={draft} />
          </EnterpriseWorkflowStatusBand>
        }
        navigation={
          <div className="flex items-center gap-2 border-b border-border/60 bg-background px-3 py-1.5 sm:px-4">
            <TabsList className="grid h-auto flex-1 grid-cols-6 bg-muted p-1">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="lenders" className="text-xs">Lender Pipeline</TabsTrigger>
              <TabsTrigger value="mission-control" className="text-xs">Mission Control</TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            </TabsList>
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 text-xs"
              onClick={() => {
                setActiveTab("lenders");
                setLenderAddOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
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
