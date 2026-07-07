"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileTimeline } from "@/components/catalyst-one/loan-files/file-timeline";
import {
  attachCommandBarScrollState,
} from "@/components/catalyst-one/shared/catalyst-command-bar";
import { LoanIntelligencePanel } from "@/components/catalyst-one/shared/loan-intelligence-panel";
import { LoanWorkbenchLayout } from "@/components/catalyst-one/shared/loan-workbench-layout";
import { LoanWorkbenchSection } from "@/components/catalyst-one/shared/loan-workbench-section";
import { LoanWorkspaceCommandBar } from "@/components/catalyst-one/shared/loan-workspace-command-bar";
import { WorkspaceHeader } from "@/components/catalyst-one/shared/workspace-header";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
import { LoanParticipantsTable } from "@/components/catalyst-one/shared/loan-participants-table";
import { LenderPipelineBoard } from "@/components/catalyst-one/execution/lender-pipeline-board";
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
import { isOccupancyApplicableToProduct } from "@/constants/occupancy-master";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import { runWithFeedback } from "@/lib/action-feedback";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import { updateLoanFileInStorage, buildStageChangePatch, buildSubStageChangePatch } from "@/lib/loan-files-utils";
import { isLoanWorkspaceDirty } from "@/lib/loan-workspace-dirty";
import { useWorkspaceClose } from "@/hooks/use-workspace-close";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { LoanParticipant } from "@/types/loan-participant";
import type {
  LendingType,
  LoanFile,
  LoanFilePriority,
  PipelineStage,
  TransactionType,
} from "@/types/catalyst-one";

function buildExecutionMessages(file: LoanFile): string[] {
  const messages: string[] = [];
  const lenders = file.lenders ?? [];
  const activeLenders = lenders.filter((l) => l.status === "active");
  if (lenders.length === 0) messages.push("No lender assigned.");
  else if (activeLenders.length === 0) messages.push("All lenders are marked closed.");

  const docs = file.documents ?? [];
  const pendingDocs = docs.filter((d) => d.status === "pending" || d.status === "requested");
  if (pendingDocs.length > 0) messages.push(`${pendingDocs.length} documents pending.`);

  const tasks = file.tasks ?? [];
  const overdue = tasks.filter((t) => {
    const status = t.status ?? (t.completed ? "completed" : "pending");
    if (status === "completed" || status === "cancelled") return false;
    return new Date(t.dueDate).getTime() < Date.now();
  });
  if (overdue.length > 0) messages.push(`${overdue.length} overdue tasks.`);

  return messages;
}

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
  defaultTab = "overview",
  embedded = false,
}: LoanWorkspaceModalProps & { file: LoanFile }) {
  const [draft, setDraft] = useState<LoanFile>(() => ({ ...file }));
  const [notes, setNotes] = useState(() => file.internalNotes);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const stickyChromeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      const participants = resolveLoanParticipants(file);
      setDraft({ ...file, participants });
      setNotes(file.internalNotes);
      setActiveTab(defaultTab);
    }
  }, [file, defaultTab]);

  const participantEntityOptions = useMemo(
    () =>
      contactOptions.length > 0
        ? mapContactOptionsToParticipantEntities(contactOptions)
        : buildDefaultParticipantEntityOptions(),
    [contactOptions],
  );

  const participants = draft.participants ?? [];

  const handleParticipantsChange = (next: LoanParticipant[]) => {
    const synced = syncParticipantLegacyFields(next, draft.businessDetails);
    patch(synced);
  };

  const hasUnsavedChanges = useMemo(
    () => isLoanWorkspaceDirty(draft, file, notes),
    [draft, file, notes],
  );

  const closeWorkspace = () => onOpenChange(false);

  const revenueBase = getRevenueBaseAmount(draft);
  const commissionValue = Math.round(revenueBase * (draft.revenuePercent / 100));
  const productOptions = getProductsForLendingType(draft.lendingType ?? "secured");
  const showFinalAmount = shouldShowFinalLoanAmount(draft.stage);

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
          next.occupancyId &&
          !isOccupancyApplicableToProduct(next.occupancyId, next.loanProduct)
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
        next.occupancyId &&
        !isOccupancyApplicableToProduct(next.occupancyId, p.loanProduct)
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
      expectedRevenue: Math.round(revenueBase * (draft.revenuePercent / 100)),
    };
  };

  const persistDraft = async (options?: {
    exitOnSuccess?: boolean;
    workflowPatch?: Partial<LoanFile>;
    successMessage?: string;
    loadingLabel?: string;
  }): Promise<boolean> => {
    const {
      exitOnSuccess = false,
      workflowPatch,
      successMessage = "Loan updated successfully.",
      loadingLabel = workflowPatch ? "Updating workflow" : "Saving loan",
    } = options ?? {};

    setSaving(true);
    try {
      const updated = await runWithFeedback(
        loadingLabel,
        async () =>
          updateLoanFileInStorage(file.id, {
            ...buildPersistPayload(),
            ...workflowPatch,
          }),
        { successMessage },
      );
      if (!updated) return false;
      setDraft(updated);
      setNotes(updated.internalNotes);
      onUpdate?.(file.id, updated);
      if (exitOnSuccess) onOpenChange(false);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => persistDraft();

  const handleSaveAndExit = () => persistDraft({ exitOnSuccess: true });

  const closeApi = useWorkspaceClose({
    onClose: closeWorkspace,
    hasUnsavedChanges,
    onSaveAndClose: () => persistDraft({ exitOnSuccess: false }),
    enableEscapeKey: false,
  });

  const handleStageChange = (newStage: PipelineStage) => {
    const workflowPatch = buildStageChangePatch(draft, newStage);
    if (!workflowPatch) return;
    void persistDraft({ workflowPatch, successMessage: "Stage updated." });
  };

  const handleSubStageChange = (subStatusId: string) => {
    const workflowPatch = buildSubStageChangePatch(draft, subStatusId);
    if (!workflowPatch) return;
    void persistDraft({ workflowPatch, successMessage: "Sub stage updated." });
  };

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    attachCommandBarScrollState(stickyChromeRef.current, e.currentTarget.scrollTop);
  };

  const commandBar = (
    <LoanWorkspaceCommandBar
      draft={draft}
      saving={saving}
      onSave={handleSave}
      onSaveAndExit={handleSaveAndExit}
      onOpenContact={onOpenContact}
      commandBarRef={stickyChromeRef}
    />
  );

  const intelligencePanel = (
    <LoanIntelligencePanel
      fileId={draft.id}
      stage={draft.stage}
      subStageId={draft.stageSubStatus}
      daysInStage={draft.daysInStage}
      timeline={draft.timeline}
      updatedBy={draft.relationshipManager}
      currentStatus={draft.status}
      saving={saving}
      executionMessages={buildExecutionMessages(draft)}
      finalLoanAmount={draft.finalLoanAmount}
      finalRoi={draft.finalRoi}
      finalTenure={draft.finalTenure}
      finalApprovalDate={draft.finalApprovalDate}
      onStageChange={handleStageChange}
      onSubStageChange={handleSubStageChange}
      onFinalTermsChange={(p) => patch(p)}
    />
  );

  const workbench = (
    <Tabs
      key={`${draft.id}-${defaultTab}`}
      value={activeTab}
      onValueChange={setActiveTab}
      className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <TabsList className="mb-6 grid h-auto w-full grid-cols-5 bg-muted p-1">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="lenders" className="text-xs">Lender Pipeline</TabsTrigger>
        <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
        <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
        <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
      </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-8">
            <LoanWorkbenchSection
              title="Loan Details"
              description="Primary operating summary for this file (enterprise workbench view)."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="File Number">
                  <Input className="h-8 bg-muted/40 text-xs" value={draft.fileNumber} readOnly />
                </Field>
                <Field label="Lending Type *">
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
                    onValueChange={(v) => patch({ transactionType: v as TransactionType })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
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
                <Field label="Priority">
                  <Select
                    value={draft.priority}
                    onValueChange={(v) => patch({ priority: v as LoanFilePriority })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["urgent", "high", "medium", "low"] as LoanFilePriority[]).map((p) => (
                        <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="RM">
                  <Select
                    value={draft.relationshipManager}
                    onValueChange={(v) => patch({ relationshipManager: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {loanManagers.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Requested Amount (₹)">
                  <INRCurrencyInput
                    value={draft.requiredAmount}
                    onChange={(v) => patch({ requiredAmount: v ?? 0 })}
                  />
                </Field>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryItem label="Loan Stage" value={STAGE_LABELS[draft.stage]} />
                <SummaryItem label="Loan Sub Stage" value={draft.stageSubStatus ? (draft.stageSubStatus ?? "—") : "—"} />
                <SummaryItem label="Expected Disbursement" value={new Date(draft.expectedDisbursement).toLocaleDateString("en-IN")} />
              </div>
            </LoanWorkbenchSection>

            <LoanWorkbenchSection
              title="Loan Participants"
              description="Master/reference participants (search and auto-populate; no manual re-entry)."
            >
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
            </LoanWorkbenchSection>

            <LoanWorkbenchSection
              title="Lender Pipeline Summary"
              description="Top active lender cases for quick visibility. Full pipeline is available under the Lender Pipeline tab."
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Active cases: {(draft.lenders ?? []).filter((c) => c.status !== "closed").length}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setActiveTab("lenders")}
                >
                  More…
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(draft.lenders ?? [])
                  .filter((c) => c.status !== "closed")
                  .slice(0, 3)
                  .map((c) => (
                    <SummaryItem
                      key={c.id}
                      label={c.isPrimary ? "Primary Lender" : "Lender Case"}
                      value={`${c.lender}${c.caseStage ? ` · ${c.caseStage}` : ""}`}
                      accent={Boolean(c.isPrimary)}
                    />
                  ))}
                {(draft.lenders ?? []).filter((c) => c.status !== "closed").length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
                    No active lender cases yet. Add one from the Lender Pipeline tab.
                  </div>
                )}
              </div>
            </LoanWorkbenchSection>

            <LoanWorkbenchSection title="RC Revenue & Accounting" description="Commission, expected revenue and settlement tracking.">
              <p className="mb-4 text-[10px] text-muted-foreground">
                Revenue base: {formatINR(revenueBase)}
                {showFinalAmount ? " (Final Loan Amount)" : " (Requested Amount)"}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Revenue %">
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={draft.revenuePercent}
                    onChange={(e) => patch({ revenuePercent: Number(e.target.value) })}
                  />
                </Field>
                <SummaryItem
                  label="Expected Revenue"
                  value={formatINR(Math.round(revenueBase * (draft.revenuePercent / 100)))}
                  accent
                />
                <SummaryItem label="Commission" value={formatINRCompact(commissionValue)} accent />
                <Field label="Revenue Received (₹)">
                  <INRCurrencyInput
                    value={draft.revenueReceived}
                    onChange={(v) => patch({ revenueReceived: v ?? 0 })}
                  />
                </Field>
                <Field label="Settlement Completed" className="sm:col-span-2">
                  <Select
                    value={draft.settlementCompleted ? "yes" : "no"}
                    onValueChange={(v) => patch({ settlementCompleted: v === "yes" })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no" className="text-xs">Pending</SelectItem>
                      <SelectItem value="yes" className="text-xs">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </LoanWorkbenchSection>
          </TabsContent>

          <TabsContent value="lenders" className="mt-0">
            <LoanWorkbenchSection
              title="Lender Pipeline"
              description="Track lender cases independently of the loan stage."
            >
              <LenderPipelineBoard
                loan={draft}
                cases={draft.lenders ?? []}
                updatedBy={draft.relationshipManager}
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
            </LoanWorkbenchSection>
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
        </Tabs>
  );

  const body = (
    <>
      <WorkspaceHeader
        title="Loan Workspace"
        onClose={closeWorkspace}
        closeApi={closeApi}
        hasUnsavedChanges={hasUnsavedChanges}
        onSaveAndClose={() => persistDraft({ exitOnSuccess: false })}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {commandBar}
        <LoanWorkbenchLayout
          workbench={workbench}
          intelligence={intelligencePanel}
          onWorkbenchScroll={handleContentScroll}
        />
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div className="relative flex h-[85vh] max-h-[85vh] w-[80vw] max-w-[80vw] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          {body}
        </div>
      </div>
    );
  }

  return (
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
  );
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
