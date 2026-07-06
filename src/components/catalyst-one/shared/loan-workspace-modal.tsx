"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
} from "lucide-react";
import { DocumentChecklist } from "@/components/catalyst-one/loan-files/document-checklist";
import { FileTimeline } from "@/components/catalyst-one/loan-files/file-timeline";
import { TaskPanel } from "@/components/catalyst-one/loan-files/task-panel";
import { EntityButtonLink, EntityLink } from "@/components/catalyst-one/shared/entity-link";
import {
  attachCommandBarScrollState,
  WorkspaceCommandBarLayout,
} from "@/components/catalyst-one/shared/catalyst-command-bar";
import { LoanWorkspaceCommandBar } from "@/components/catalyst-one/shared/loan-workspace-command-bar";
import { OrganizationRegistrySelect } from "@/components/catalyst-one/shared/organization-registry-select";
import { PropertyTypeSelect } from "@/components/catalyst-one/shared/property-type-select";
import {
  computeTopUpRequested,
  getProductsForLendingType,
  isBalanceTransferVisible,
  isPropertyQualificationVisible,
  LENDING_TYPES,
  shouldShowFinalLoanAmount,
  TRANSACTION_TYPES,
} from "@/constants/loan-pipeline";
import { LEAD_SOURCES } from "@/constants/customer-360";
import { loanLenders, loanManagers } from "@/data/catalyst-one/loan-files";
import { runWithFeedback } from "@/lib/action-feedback";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import { formatINR, formatINRCompact, formatINRInput, parseINRInput } from "@/lib/format-currency";
import { updateLoanFileInStorage, buildStageChangePatch, buildSubStageChangePatch } from "@/lib/loan-files-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  LendingType,
  LoanFile,
  LoanFilePriority,
  LoanFileBusiness,
  LoanFileStatus,
  PipelineStage,
  TransactionType,
} from "@/types/catalyst-one";

export interface ContactOption {
  id: string;
  name: string;
}

export interface LoanWorkspaceModalProps {
  file: LoanFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (fileId: string, patch: Partial<LoanFile>) => void;
  onOpenContact?: (contactId: string) => void;
  contactOptions?: ContactOption[];
  /** @deprecated Use standard Dialog — customer workspace hides parent while loan is open. */
  embedded?: boolean;
}

/** CRC-005 / CRC-015 — Authoritative Loan Workspace. */
export function LoanWorkspaceModal({
  file,
  open,
  onOpenChange,
  onUpdate,
  onOpenContact,
  contactOptions = [],
  embedded = false,
}: LoanWorkspaceModalProps) {
  const [draft, setDraft] = useState<LoanFile | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const stickyChromeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      setDraft({ ...file });
      setNotes(file.internalNotes);
    }
  }, [file]);

  if (!open || !file || !draft) return null;

  const revenueBase = getRevenueBaseAmount(draft);
  const commissionValue = Math.round(revenueBase * (draft.revenuePercent / 100));
  const productOptions = getProductsForLendingType(draft.lendingType ?? "secured");
  const showPropertyFields = isPropertyQualificationVisible(draft.loanProduct);
  const showBt = isBalanceTransferVisible(
    draft.lendingType ?? "secured",
    draft.transactionType ?? "fresh",
  );
  const showFinalAmount = shouldShowFinalLoanAmount(draft.stage);
  const topUp =
    draft.btAmount != null
      ? computeTopUpRequested(draft.requiredAmount, draft.btAmount)
      : draft.topUpRequested ?? 0;

  const patch = (p: Partial<LoanFile>) =>
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, ...p };
      if (p.btAmount !== undefined || p.requiredAmount !== undefined) {
        const bt = p.btAmount ?? next.btAmount ?? 0;
        next.topUpRequested = computeTopUpRequested(next.requiredAmount, bt);
      }
      if (p.lendingType) {
        const allowed = getProductsForLendingType(p.lendingType);
        if (!allowed.includes(next.loanProduct)) {
          next.loanProduct = allowed[0] ?? next.loanProduct;
        }
        if (!isPropertyQualificationVisible(next.loanProduct)) {
          next.propertyType = undefined;
          next.approxPropertyValue = undefined;
        }
      }
      if (p.loanProduct && !isPropertyQualificationVisible(p.loanProduct)) {
        next.propertyType = undefined;
        next.approxPropertyValue = undefined;
      }
      return next;
    });

  const patchBusiness = (p: Partial<LoanFileBusiness>) =>
    patch({ businessDetails: { ...draft.businessDetails, ...p } });

  const buildPersistPayload = (): Partial<LoanFile> => ({
    ...draft,
    internalNotes: notes,
    topUpRequested: topUp,
    expectedRevenue: Math.round(revenueBase * (draft.revenuePercent / 100)),
  });

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
        onStageChange={handleStageChange}
        onSubStageChange={handleSubStageChange}
      commandBarRef={stickyChromeRef}
    />
  );

  const body = (
    <WorkspaceCommandBarLayout commandBar={commandBar} onBodyScroll={handleContentScroll}>
      <Tabs defaultValue="overview" className="px-6 pt-5 pb-6">
          <TabsList className="w-full grid grid-cols-5 mb-4 bg-muted">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Documents</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">Tasks</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <section>
              <h4 className="text-sm font-semibold mb-3 text-foreground">Applicant</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Name">
                  <Input
                    className="h-8 text-xs"
                    value={draft.customerName}
                    onChange={(e) => patch({ customerName: e.target.value })}
                  />
                </Field>
                <Field label="Mobile">
                  <Input
                    className="h-8 text-xs"
                    value={draft.customerMobile}
                    onChange={(e) => patch({ customerMobile: e.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    className="h-8 text-xs"
                    value={draft.customerEmail}
                    onChange={(e) => patch({ customerEmail: e.target.value })}
                  />
                </Field>
                <Field label="City">
                  <Input
                    className="h-8 text-xs"
                    value={draft.city}
                    onChange={(e) => patch({ city: e.target.value })}
                  />
                </Field>
                <Field label="State">
                  <Input
                    className="h-8 text-xs"
                    value={draft.state}
                    onChange={(e) => patch({ state: e.target.value })}
                  />
                </Field>
                <Field label="Employment">
                  <Input
                    className="h-8 text-xs"
                    value={draft.employmentType}
                    onChange={(e) => patch({ employmentType: e.target.value })}
                  />
                </Field>
              </div>
              {onOpenContact && (
                <EntityButtonLink
                  label="Open applicant workspace"
                  className="text-xs mt-2"
                  onClick={() => onOpenContact(draft.customerId)}
                />
              )}
            </section>

            <Separator />

            <section>
              <h4 className="text-sm font-semibold mb-3 text-foreground">Loan Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="File Number">
                  <Input className="h-8 text-xs bg-muted/40" value={draft.fileNumber} readOnly />
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
                      if (!isPropertyQualificationVisible(v)) {
                        updates.propertyType = undefined;
                        updates.approxPropertyValue = undefined;
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
                {showPropertyFields && (
                  <>
                    <Field label="Property Type *" className="sm:col-span-2">
                      <PropertyTypeSelect
                        value={draft.propertyType}
                        onSelect={(type) => patch({ propertyType: type })}
                      />
                    </Field>
                    <Field label="Approx Property Value (₹)">
                      <Input
                        className="h-8 text-xs"
                        inputMode="numeric"
                        placeholder="e.g. 75,00,000"
                        value={formatINRInput(draft.approxPropertyValue)}
                        onChange={(e) => {
                          const amount = parseINRInput(e.target.value);
                          patch({ approxPropertyValue: amount > 0 ? amount : undefined });
                        }}
                      />
                    </Field>
                  </>
                )}
                <Field label="Lender">
                  <Select value={draft.lender} onValueChange={(v) => patch({ lender: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {loanLenders.map((l) => (
                        <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
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
                <Field label="Loan Amount">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={draft.loanAmount}
                    onChange={(e) => patch({ loanAmount: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Requested Amount">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={draft.requiredAmount}
                    onChange={(e) => patch({ requiredAmount: Number(e.target.value) })}
                  />
                </Field>
                {showFinalAmount && (
                  <Field label="Final Loan Amount *">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={draft.finalLoanAmount ?? ""}
                      onChange={(e) => patch({ finalLoanAmount: Number(e.target.value) })}
                    />
                  </Field>
                )}
                <Field label="Sanction Amount">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={draft.sanctionAmount}
                    onChange={(e) => patch({ sanctionAmount: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Disbursement">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={draft.disbursementAmount}
                    onChange={(e) => patch({ disbursementAmount: Number(e.target.value) })}
                  />
                </Field>
                <Field label="ROI %">
                  <Input
                    type="number"
                    step="0.1"
                    className="h-8 text-xs"
                    value={draft.interestRate}
                    onChange={(e) => patch({ interestRate: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Tenure (months)">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={draft.tenure}
                    onChange={(e) => patch({ tenure: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={draft.status}
                    onValueChange={(v) => patch({ status: v as LoanFileStatus })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["on_track", "at_risk", "delayed", "completed"] as LoanFileStatus[]).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Source">
                  <Select value={draft.source ?? "Direct"} onValueChange={(v) => patch({ source: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...LEAD_SOURCES, "Referral", "Walk-in"].map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Source Contact">
                  {contactOptions.length > 0 ? (
                    <Select
                      value={draft.sourceContactId ?? "none"}
                      onValueChange={(v) => {
                        if (v === "none") {
                          patch({ sourceContactId: undefined, sourceContactName: undefined });
                          return;
                        }
                        const contact = contactOptions.find((c) => c.id === v);
                        patch({
                          sourceContactId: v,
                          sourceContactName: contact?.name,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select contact" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">—</SelectItem>
                        {contactOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-8 text-xs"
                      value={draft.sourceContactName ?? ""}
                      onChange={(e) => patch({ sourceContactName: e.target.value })}
                    />
                  )}
                </Field>
              </div>
              {draft.sourceContactId && onOpenContact && (
                <EntityButtonLink
                  label="Open source contact workspace"
                  className="text-xs mt-2"
                  onClick={() => onOpenContact(draft.sourceContactId!)}
                />
              )}
              <div className="mt-2">
                <EntityLink type="lender" id={draft.lender} label={`Open ${draft.lender} workspace`} className="text-xs" />
              </div>
            </section>

            {showBt && (
              <>
                <Separator />
                <section>
                  <h4 className="text-sm font-semibold mb-3 text-foreground">Balance Transfer</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="BT Institution *" className="sm:col-span-2">
                      <OrganizationRegistrySelect
                        value={draft.btInstitutionId}
                        onSelect={(org) =>
                          patch({
                            btInstitutionId: org.id,
                            btInstitutionName: org.name,
                          })
                        }
                      />
                    </Field>
                    {draft.btInstitutionId && (
                      <div className="flex items-end">
                        <EntityLink
                          type="company"
                          id={draft.btInstitutionId}
                          label="Open organization workspace"
                          className="text-xs"
                        />
                      </div>
                    )}
                    <Field label="BT Amount *">
                      <Input
                        type="number"
                        className="h-8 text-xs"
                        value={draft.btAmount ?? ""}
                        onChange={(e) => patch({ btAmount: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Top-up Requested">
                      <Input
                        className="h-8 text-xs bg-muted/40"
                        value={topUp}
                        readOnly
                      />
                    </Field>
                  </div>
                </section>
              </>
            )}

            <Separator />

            <section>
              <h4 className="text-sm font-semibold mb-3 text-foreground">Parties</h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Co-applicant">
                  <Input
                    className="h-8 text-xs"
                    value={draft.coApplicant ?? ""}
                    onChange={(e) => patch({ coApplicant: e.target.value || undefined })}
                  />
                </Field>
                <Field label="Co-applicant Contact">
                  <Select
                    value={draft.coApplicantId ?? "none"}
                    onValueChange={(v) => patch({ coApplicantId: v === "none" ? undefined : v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">—</SelectItem>
                      {contactOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Guarantor">
                  <Input
                    className="h-8 text-xs"
                    value={draft.guarantor ?? ""}
                    onChange={(e) => patch({ guarantor: e.target.value || undefined })}
                  />
                </Field>
                <Field label="Guarantor Contact">
                  <Select
                    value={draft.guarantorId ?? "none"}
                    onValueChange={(v) => patch({ guarantorId: v === "none" ? undefined : v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">—</SelectItem>
                      {contactOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {draft.coApplicantId && onOpenContact && (
                  <EntityButtonLink
                    label="Open co-applicant workspace"
                    className="text-xs"
                    onClick={() => onOpenContact(draft.coApplicantId!)}
                  />
                )}
                {draft.guarantorId && onOpenContact && (
                  <EntityButtonLink
                    label="Open guarantor workspace"
                    className="text-xs"
                    onClick={() => onOpenContact(draft.guarantorId!)}
                  />
                )}
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-sm font-semibold mb-3 text-foreground">Company</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Company Name">
                  <Input
                    className="h-8 text-xs"
                    value={draft.businessDetails?.companyName ?? ""}
                    onChange={(e) => patchBusiness({ companyName: e.target.value })}
                  />
                </Field>
                <Field label="Constitution">
                  <Input
                    className="h-8 text-xs"
                    value={draft.businessDetails?.constitution ?? ""}
                    onChange={(e) => patchBusiness({ constitution: e.target.value })}
                  />
                </Field>
                <Field label="GST">
                  <Input
                    className="h-8 text-xs"
                    value={draft.businessDetails?.gst ?? ""}
                    onChange={(e) => patchBusiness({ gst: e.target.value })}
                  />
                </Field>
                <Field label="Annual Turnover">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={draft.businessDetails?.annualTurnover ?? ""}
                    onChange={(e) => patchBusiness({ annualTurnover: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-sm font-semibold mb-3 text-foreground">RC Revenue & Accounting</h4>
              <p className="text-[10px] text-muted-foreground mb-3">
                Revenue base: {formatINR(revenueBase)}
                {showFinalAmount ? " (Final Loan Amount)" : " (Requested Amount)"}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Revenue %">
                  <Input
                    type="number"
                    step="0.01"
                    className="h-8 text-xs"
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
                <Field label="Revenue Received">
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={draft.revenueReceived}
                    onChange={(e) => patch({ revenueReceived: Number(e.target.value) })}
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
            </section>
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <DocumentChecklist documents={draft.documents} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-0">
            <TaskPanel fileId={draft.id} tasks={draft.tasks} />
          </TabsContent>

          <TabsContent value="timeline" className="mt-0">
            <FileTimeline events={draft.timeline} />
          </TabsContent>

          <TabsContent value="notes" className="mt-0 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Internal Notes</h4>
            <textarea
              rows={12}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(
                "min-h-[240px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </TabsContent>
        </Tabs>
    </WorkspaceCommandBarLayout>
  );

  if (embedded) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div className="relative w-[80vw] max-w-[80vw] h-[85vh] max-h-[85vh] flex flex-col overflow-hidden rounded-xl bg-background border border-border shadow-xl">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-10 h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          {body}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-[80vw] h-[85vh] max-h-[85vh] p-0 gap-0 flex flex-col rounded-xl overflow-hidden">
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
