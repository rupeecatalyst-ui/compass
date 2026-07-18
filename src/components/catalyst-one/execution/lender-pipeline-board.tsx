"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { LenderLogo } from "@/components/catalyst-one/shared/lender-logo";
import { INRCurrencyInput } from "@/components/catalyst-one/shared/inr-currency-input";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EdieComplianceSummaryDialog } from "@/components/catalyst-one/shared/edie-compliance-summary-dialog";
import { evaluateEdieComplianceGate } from "@/lib/edie-certified";
import type { EdieComplianceGateResult } from "@/types/edie-certified-rules";
import { cn } from "@/lib/utils";
import {
  LENDER_CASE_STAGES,
  LENDER_CASE_STAGE_COLORS,
  LENDER_CASE_STAGE_LABELS,
  LENDER_LOST_REASONS,
  LENDER_PROBABILITY_LABELS,
  isPreExecutionStage,
  normalizeLenderCaseStage,
} from "@/constants/lender-pipeline";
import { buildElwWorkspaceHref, normalizeLenderId } from "@/constants/enterprise-lender-workspace";
import { ROUTES } from "@/constants/routes";
import { LOAN_FILE_PRIORITY_STYLES } from "@/constants/loan-status";
import type {
  LenderCaseStage,
  LenderLostReason,
  LenderPaymentStatus,
  LenderProbability,
  LoanFile,
  LoanLenderExecution,
} from "@/types/catalyst-one";
import { loanLenders } from "@/data/catalyst-one/loan-files";
import Link from "next/link";
import { toast } from "sonner";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type WorkflowCase = LoanLenderExecution & { targetStage: LenderCaseStage };

export function LenderPipelineBoard({
  loan,
  cases,
  updatedBy,
  onChange,
  onTimeline,
  addOpen,
  onAddOpenChange,
}: {
  loan: LoanFile;
  cases: LoanLenderExecution[];
  updatedBy: string;
  onChange: (next: LoanLenderExecution[]) => void;
  onTimeline: (note: string) => void;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
}) {
  const [dragOverStage, setDragOverStage] = useState<LenderCaseStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addOpenInternal, setAddOpenInternal] = useState(false);
  const addDialogOpen = addOpen ?? addOpenInternal;
  const setAddDialogOpen = onAddOpenChange ?? setAddOpenInternal;

  const assignedLenders = useMemo(
    () => new Set(cases.map((c) => c.lender).filter(Boolean)),
    [cases],
  );
  const availableLenders = useMemo(
    () => loanLenders.filter((l) => !assignedLenders.has(l)),
    [assignedLenders],
  );

  const [disbursementCase, setDisbursementCase] = useState<WorkflowCase | null>(null);
  const [lostCase, setLostCase] = useState<WorkflowCase | null>(null);
  const [holdCase, setHoldCase] = useState<WorkflowCase | null>(null);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [complianceResult, setComplianceResult] = useState<EdieComplianceGateResult | null>(null);

  const [addForm, setAddForm] = useState<{
    lender: string;
    expectedLoanAmount: number;
    caseStage: LenderCaseStage;
    caseSubStage: string;
  }>({
    lender: loanLenders[0] ?? "HDFC Bank",
    expectedLoanAmount: loan.requiredAmount,
    caseStage: "identified" as LenderCaseStage,
    caseSubStage: "",
  });

  const [disbursementForm, setDisbursementForm] = useState({
    disbursementDate: new Date().toISOString().slice(0, 10),
    disbursedAmount: loan.requiredAmount,
    finalRoi: loan.interestRate ?? 0,
    finalTenure: loan.tenure ?? 0,
    processingFee: 0,
    revenue: 0,
    invoiceRaised: false,
    paymentStatus: "pending" as LenderPaymentStatus,
  });

  const [lostReason, setLostReason] = useState<LenderLostReason>("rejected");
  const [holdForm, setHoldForm] = useState({ holdReason: "", holdReviewDate: "" });

  useEffect(() => {
    if (!addDialogOpen) return;
    setAddForm((f) => {
      const currentOk = availableLenders.includes(f.lender as (typeof availableLenders)[number]);
      return {
        ...f,
        lender: currentOk ? f.lender : (availableLenders[0] ?? ""),
        expectedLoanAmount: f.expectedLoanAmount || loan.requiredAmount,
      };
    });
  }, [addDialogOpen, availableLenders, loan.requiredAmount]);

  const casesByStage = useMemo(() => {
    const map = new Map<LenderCaseStage, LoanLenderExecution[]>();
    for (const stage of LENDER_CASE_STAGES) map.set(stage.id, []);
    cases.forEach((c) => {
      const stage = normalizeLenderCaseStage(c.caseStage);
      const arr = map.get(stage) ?? [];
      arr.push(c);
      map.set(stage, arr);
    });
    return map;
  }, [cases]);

  const applyMove = (caseId: string, stage: LenderCaseStage, patch?: Partial<LoanLenderExecution>) => {
    const next = cases.map((c) =>
      c.id === caseId
        ? {
            ...c,
            ...patch,
            caseStage: stage,
            updatedBy,
            updatedAt: nowIso(),
          }
        : c,
    );
    const moved = cases.find((c) => c.id === caseId);
    onChange(next);
    onTimeline(`Lender moved: ${moved?.lender ?? caseId} → ${LENDER_CASE_STAGE_LABELS[stage]}`);
    setDragOverStage(null);
    setDraggingId(null);
  };

  const handleDragStart = (e: React.DragEvent, caseId: string) => {
    e.dataTransfer.setData("text/plain", caseId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(caseId);
  };

  const handleDrop = (e: React.DragEvent, stage: LenderCaseStage) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData("text/plain");
    if (!caseId) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c) return;

    if (stage === "disbursed") {
      setDisbursementCase({ ...c, targetStage: stage });
      setDisbursementForm({
        disbursementDate: new Date().toISOString().slice(0, 10),
        disbursedAmount: c.expectedLoanAmount ?? loan.requiredAmount,
        finalRoi: c.finalRoi ?? loan.interestRate ?? 0,
        finalTenure: c.finalTenure ?? loan.tenure ?? 0,
        processingFee: c.processingFee ?? 0,
        revenue: c.revenue ?? 0,
        invoiceRaised: c.invoiceRaised ?? false,
        paymentStatus: c.paymentStatus ?? "pending",
      });
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }
    if (stage === "lost") {
      setLostCase({ ...c, targetStage: stage });
      setLostReason(c.lostReason ?? "rejected");
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }
    if (stage === "hold") {
      setHoldCase({ ...c, targetStage: stage });
      setHoldForm({
        holdReason: c.holdReason ?? "",
        holdReviewDate: c.holdReviewDate ?? "",
      });
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }

    applyMove(caseId, stage);
  };

  const submitAddCase = () => {
    if (!addForm.lender || assignedLenders.has(addForm.lender)) return;
    const ts = nowIso();
    const next: LoanLenderExecution = {
      id: newId("lcase"),
      lender: addForm.lender,
      status: "active",
      caseStage: addForm.caseStage,
      caseSubStage: addForm.caseSubStage || undefined,
      expectedLoanAmount: addForm.expectedLoanAmount,
      probability: "medium",
      isPrimary: cases.length === 0,
      relationshipManager: loan.relationshipManager,
      createdBy: updatedBy,
      updatedBy,
      createdAt: ts,
      updatedAt: ts,
    };
    onChange([next, ...cases]);
    onTimeline(`Lender case created: ${addForm.lender}`);
    setAddDialogOpen(false);
    const remaining = loanLenders.filter(
      (l) => l !== addForm.lender && !assignedLenders.has(l),
    );
    setAddForm({
      lender: remaining[0] ?? "",
      expectedLoanAmount: loan.requiredAmount,
      caseStage: "identified",
      caseSubStage: "",
    });
  };

  const setPrimary = (id: string) => {
    const next = cases.map((c) => ({ ...c, isPrimary: c.id === id, updatedBy, updatedAt: nowIso() }));
    const primary = cases.find((c) => c.id === id);
    onChange(next);
    onTimeline(`Primary lender set: ${primary?.lender ?? id}`);
  };

  const updateProbability = (id: string, p: LenderProbability) => {
    const next = cases.map((c) => (c.id === id ? { ...c, probability: p, updatedBy, updatedAt: nowIso() } : c));
    const lender = cases.find((c) => c.id === id);
    onChange(next);
    onTimeline(`Success probability updated: ${lender?.lender ?? id} → ${LENDER_PROBABILITY_LABELS[p]}`);
  };

  const removeCase = (id: string) => {
    const lender = cases.find((c) => c.id === id);
    onChange(cases.filter((c) => c.id !== id));
    onTimeline(`Lender case removed: ${lender?.lender ?? id}`);
  };

  const startLogin = (id: string) => {
    const c = cases.find((x) => x.id === id);
    if (!c || !isPreExecutionStage(c.caseStage)) return;
    applyMove(id, "prelogin");
    toast.success(`${c.lender} moved to Pre Login — execution started.`);
  };

  const reorderIdentified = (id: string, direction: "up" | "down") => {
    const identified = cases.filter((c) => normalizeLenderCaseStage(c.caseStage) === "identified");
    const others = cases.filter((c) => normalizeLenderCaseStage(c.caseStage) !== "identified");
    const idx = identified.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= identified.length) return;
    const nextIdentified = [...identified];
    const tmp = nextIdentified[idx]!;
    nextIdentified[idx] = nextIdentified[swapWith]!;
    nextIdentified[swapWith] = tmp;
    onChange([...nextIdentified, ...others]);
    onTimeline(`Identified order updated: ${tmp.lender}`);
  };

  const confirmDisbursement = () => {
    if (!disbursementCase) return;
    // Disbursed → Invoicing: mandatory EDIE compliance gate only when invoice is raised.
    if (disbursementForm.invoiceRaised) {
      const gate = evaluateEdieComplianceGate(loan);
      if (!gate.allowed) {
        setComplianceResult(gate);
        setComplianceOpen(true);
        return;
      }
    }
    applyMove(disbursementCase.id, "disbursed", {
      disbursementDate: disbursementForm.disbursementDate,
      disbursedAmount: disbursementForm.disbursedAmount,
      finalRoi: disbursementForm.finalRoi,
      finalTenure: disbursementForm.finalTenure,
      processingFee: disbursementForm.processingFee,
      revenue: disbursementForm.revenue,
      invoiceRaised: disbursementForm.invoiceRaised,
      paymentStatus: disbursementForm.paymentStatus,
    });
    setDisbursementCase(null);
  };

  const confirmLost = () => {
    if (!lostCase) return;
    applyMove(lostCase.id, "lost", { lostReason });
    setLostCase(null);
  };

  const confirmHold = () => {
    if (!holdCase || !holdForm.holdReason.trim() || !holdForm.holdReviewDate) return;
    applyMove(holdCase.id, "hold", {
      holdReason: holdForm.holdReason.trim(),
      holdReviewDate: holdForm.holdReviewDate,
    });
    setHoldCase(null);
  };

  return (
    <div className="min-h-0">
      <div className="h-[calc(100vh-210px)] min-h-[560px] overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div className="flex h-full w-full min-w-max gap-1 pb-1">
          {LENDER_CASE_STAGES.map((col) => {
            const colCases = casesByStage.get(col.id) ?? [];
            const isDragOver = dragOverStage === col.id;
            return (
              <div
                key={col.id}
                className={cn("flex min-w-[148px] flex-1 flex-col h-full max-w-[220px]")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(col.id);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div
                  className={cn(
                    "shrink-0 rounded-t-md border border-b-0 border-border bg-card/90 px-2 py-1",
                    isDragOver && "border-primary/40 bg-primary/5",
                  )}
                  style={{ borderTopWidth: 3, borderTopColor: col.color }}
                >
                  <h4 className="text-[11px] font-semibold text-foreground truncate leading-tight">
                    {col.label} ({colCases.length})
                  </h4>
                </div>
                <div
                  className={cn(
                    "flex-1 min-h-0 rounded-b-md border border-t-0 border-border bg-muted/15 p-0.5 overflow-y-auto scrollbar-thin",
                    isDragOver && "bg-primary/5 border-primary/30",
                  )}
                >
                  <div className="space-y-0.5">
                    {colCases.map((c) => (
                      <LenderCaseKanbanCard
                        key={c.id}
                        loan={loan}
                        stageLabel={col.label}
                        stageColor={LENDER_CASE_STAGE_COLORS[col.id]}
                        caseExecution={c}
                        probability={c.probability ?? "medium"}
                        onDragStart={handleDragStart}
                        onSetPrimary={() => setPrimary(c.id)}
                        onRemove={() => removeCase(c.id)}
                        onProbabilityChange={(p) => updateProbability(c.id, p)}
                        onStartLogin={() => startLogin(c.id)}
                        onReorderUp={() => reorderIdentified(c.id, "up")}
                        onReorderDown={() => reorderIdentified(c.id, "down")}
                      />
                    ))}
                    {colCases.length === 0 && (
                      <div
                        className={cn(
                          "flex h-12 items-center justify-center rounded border border-dashed border-border text-[9px] text-muted-foreground",
                          isDragOver && "border-primary/40 text-primary",
                        )}
                      >
                        {isDragOver ? "Drop" : "—"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {draggingId && (
          <div
            className="fixed inset-0 z-10 pointer-events-none"
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverStage(null);
            }}
          />
        )}
      </div>

      {/* Add Lender Case */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Lender Case</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Lender</Label>
              <Select
                value={addForm.lender}
                onValueChange={(v) => setAddForm((f) => ({ ...f, lender: v }))}
                disabled={availableLenders.length === 0}
              >
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select lender" /></SelectTrigger>
                <SelectContent>
                  {availableLenders.length === 0 ? (
                    <SelectItem value="__none" disabled className="text-xs">
                      All lenders already assigned
                    </SelectItem>
                  ) : (
                    availableLenders.map((l) => (
                      <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {availableLenders.length === 0 && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Each lender may appear once on this opportunity. Remove a case to restore it here.
                </p>
              )}
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Expected Loan Amount</Label>
              <INRCurrencyInput
                className="mt-1"
                value={addForm.expectedLoanAmount}
                onChange={(v) => setAddForm((f) => ({ ...f, expectedLoanAmount: v ?? 0 }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Stage</Label>
              <Select
                value={addForm.caseStage}
                onValueChange={(v) => setAddForm((f) => ({ ...f, caseStage: v as LenderCaseStage }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LENDER_CASE_STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Sub Stage</Label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="Optional sub stage"
                value={addForm.caseSubStage}
                onChange={(e) => setAddForm((f) => ({ ...f, caseSubStage: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              onClick={submitAddCase}
              disabled={!addForm.lender || availableLenders.length === 0}
            >
              Add Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disbursement workflow */}
      <Dialog open={Boolean(disbursementCase)} onOpenChange={(o) => !o && setDisbursementCase(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Disbursement Details — {disbursementCase?.lender}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field label="Disbursement Date *">
              <Input
                type="date"
                className="h-8 text-xs"
                value={disbursementForm.disbursementDate}
                onChange={(e) => setDisbursementForm((f) => ({ ...f, disbursementDate: e.target.value }))}
              />
            </Field>
            <Field label="Disbursed Amount *">
              <INRCurrencyInput
                value={disbursementForm.disbursedAmount}
                onChange={(v) => setDisbursementForm((f) => ({ ...f, disbursedAmount: v ?? 0 }))}
              />
            </Field>
            <Field label="Final ROI (%) *">
              <Input
                type="number"
                className="h-8 text-xs"
                value={disbursementForm.finalRoi}
                onChange={(e) => setDisbursementForm((f) => ({ ...f, finalRoi: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Final Tenure (months) *">
              <Input
                type="number"
                className="h-8 text-xs"
                value={disbursementForm.finalTenure}
                onChange={(e) => setDisbursementForm((f) => ({ ...f, finalTenure: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Processing Fee *">
              <INRCurrencyInput
                value={disbursementForm.processingFee}
                onChange={(v) => setDisbursementForm((f) => ({ ...f, processingFee: v ?? 0 }))}
              />
            </Field>
            <Field label="Revenue *">
              <INRCurrencyInput
                value={disbursementForm.revenue}
                onChange={(v) => setDisbursementForm((f) => ({ ...f, revenue: v ?? 0 }))}
              />
            </Field>
            <Field label="Invoice Raised *">
              <Select
                value={disbursementForm.invoiceRaised ? "yes" : "no"}
                onValueChange={(v) => setDisbursementForm((f) => ({ ...f, invoiceRaised: v === "yes" }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no" className="text-xs">No</SelectItem>
                  <SelectItem value="yes" className="text-xs">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Payment Status *">
              <Select
                value={disbursementForm.paymentStatus}
                onValueChange={(v) => setDisbursementForm((f) => ({ ...f, paymentStatus: v as LenderPaymentStatus }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["pending", "raised", "received", "overdue"] as LenderPaymentStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setDisbursementCase(null)}>Cancel</Button>
            <Button type="button" size="sm" onClick={confirmDisbursement}>Complete Disbursement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost workflow */}
      <Dialog open={Boolean(lostCase)} onOpenChange={(o) => !o && setLostCase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Mark as Lost — {lostCase?.lender}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-[10px] uppercase text-muted-foreground">Reason *</Label>
            <Select value={lostReason} onValueChange={(v) => setLostReason(v as LenderLostReason)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LENDER_LOST_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setLostCase(null)}>Cancel</Button>
            <Button type="button" size="sm" variant="destructive" onClick={confirmLost}>Confirm Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold workflow */}
      <Dialog open={Boolean(holdCase)} onOpenChange={(o) => !o && setHoldCase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Place on Hold — {holdCase?.lender}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Hold Reason *</Label>
              <Input
                className="mt-1 h-8 text-xs"
                value={holdForm.holdReason}
                onChange={(e) => setHoldForm((f) => ({ ...f, holdReason: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Expected Review Date *</Label>
              <Input
                type="date"
                className="mt-1 h-8 text-xs"
                value={holdForm.holdReviewDate}
                onChange={(e) => setHoldForm((f) => ({ ...f, holdReviewDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setHoldCase(null)}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmHold}
              disabled={!holdForm.holdReason.trim() || !holdForm.holdReviewDate}
            >
              Confirm Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EdieComplianceSummaryDialog
        open={complianceOpen}
        onOpenChange={setComplianceOpen}
        result={complianceResult}
        fileId={loan.id}
        opportunityId={undefined}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function LenderCaseKanbanCard({
  loan,
  stageLabel,
  stageColor,
  caseExecution,
  probability,
  onDragStart,
  onSetPrimary,
  onRemove,
  onProbabilityChange,
  onStartLogin,
  onReorderUp,
  onReorderDown,
}: {
  loan: LoanFile;
  stageLabel: string;
  stageColor: string;
  caseExecution: LoanLenderExecution;
  probability: LenderProbability;
  onDragStart: (e: React.DragEvent, caseId: string) => void;
  onSetPrimary: () => void;
  onRemove: () => void;
  onProbabilityChange: (p: LenderProbability) => void;
  onStartLogin: () => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
}) {
  const rm = caseExecution.relationshipManager ?? loan.relationshipManager;
  const stage = normalizeLenderCaseStage(caseExecution.caseStage);
  const identified = stage === "identified";
  const product = caseExecution.product ?? loan.loanProduct;
  const createdBy = caseExecution.createdBy ?? "—";
  const createdDate = caseExecution.createdAt
    ? new Date(caseExecution.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const elwHref = buildElwWorkspaceHref(
    normalizeLenderId(caseExecution.lenderRef ?? caseExecution.lender),
    {
      from: "loan_files",
      loanFileId: loan.id,
      returnTo: ROUTES.LOAN_FILES,
    },
  );

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, caseExecution.id)}
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-grab active:cursor-grabbing rounded-md border border-border bg-card/95",
        "border-l-[3px] shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
        "p-1.5",
      )}
      style={{ borderLeftColor: stageColor }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <LenderLogo lender={caseExecution.lender} size="lg" className="rounded-md shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-tight truncate text-foreground">
              {caseExecution.lender}
            </p>
            <p className="text-[9px] text-muted-foreground truncate">{product}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
              aria-label="More"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {identified ? (
              <>
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onStartLogin())}>
                  Start Login
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={elwHref}>Open Lender</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onReorderUp())}>
                  Reorder · Up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onReorderDown())}>
                  Reorder · Down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem onClick={(e) => (e.preventDefault(), onSetPrimary())}>
              Set Primary
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Success Probability</p>
              <Select value={probability} onValueChange={(v) => onProbabilityChange(v as LenderProbability)}>
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ["very_high", "high", "medium", "low", "very_low", "rejected", "withdrawn"] as LenderProbability[]
                  ).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {LENDER_PROBABILITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => (e.preventDefault(), onRemove())}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-0.5">
        <Badge
          variant="outline"
          className="h-3.5 px-1 text-[8px] border font-medium"
          style={{ borderColor: stageColor, color: stageColor }}
        >
          {stageLabel}
        </Badge>
        {caseExecution.isPrimary ? (
          <Badge
            variant="outline"
            className="h-3.5 px-1 text-[8px] border border-emerald-600/25 bg-emerald-600/10 text-emerald-800"
          >
            Primary
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={cn("h-3.5 px-1 text-[8px] capitalize border", LOAN_FILE_PRIORITY_STYLES[loan.priority].className)}
        >
          {loan.priority}
        </Badge>
      </div>

      <div className="mt-1 space-y-0 text-[9px] text-muted-foreground leading-snug">
        {caseExecution.expectedRoi != null ? (
          <p>Expected ROI {caseExecution.expectedRoi}%</p>
        ) : null}
        {caseExecution.specialNotes ? (
          <p className="line-clamp-2 text-foreground/80">{caseExecution.specialNotes}</p>
        ) : null}
        <p className="truncate">RM {rm}</p>
        <p>
          Created by {createdBy} · {createdDate}
        </p>
        <p className="font-medium text-foreground/85">Status · {stageLabel}</p>
      </div>

      {identified ? (
        <div className="mt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          <Button type="button" size="sm" className="h-6 px-1.5 text-[9px]" onClick={onStartLogin}>
            Start Login
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[9px]" asChild>
            <Link href={elwHref}>Open Lender</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
