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
import { ChanakyaLenderLoginProbeDialog } from "@/components/catalyst-one/execution/chanakya-lender-login-probe-dialog";
import { LenderStrategyDrawer } from "@/components/catalyst-one/execution/lender-strategy-drawer";
import { tracePipelineDrag } from "@/lib/enterprise-deal/pipeline-drag-trace";
import {
  buildLenderLoginProbePatch,
  isLenderLoginProbeComplete,
  type LenderLoginProbeValues,
} from "@/lib/lender-pipeline/login-probe";
import type { LoanCommercialPayeeType } from "@/constants/loan-commercial-payee";
import { toast } from "sonner";
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
import type {
  LenderCaseStage,
  LenderLostReason,
  LenderPaymentStatus,
  LenderProbability,
  LoanLenderExecution,
} from "@/types/catalyst-one";
import { EnterpriseLenderSearch } from "@/components/catalyst-one/shared/enterprise-lender-search";
import { rememberDealLender } from "@/lib/deal-workspace/recent-deal-lenders";
import type { DealPipelineContext } from "@/types/deal-pipeline-runtime";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type WorkflowCase = LoanLenderExecution & { targetStage: LenderCaseStage };

export function LenderPipelineBoard({
  context,
  cases,
  updatedBy,
  onChange,
  onTimeline,
  addOpen,
  onAddOpenChange,
  onOpenLenderDocuments,
  onIdentifyLender,
  onActiveCaseChange,
}: {
  /** CO-ARCH-005 — Deal Registry context only (not LoanFile). */
  context: DealPipelineContext;
  cases: LoanLenderExecution[];
  updatedBy: string;
  onChange: (next: LoanLenderExecution[]) => void;
  /** @deprecated CO-UX-001 — Payee is Accounting Stage; not collected during lender identification. */
  onCommercialPayeeChange?: (next: {
    commercialPayee?: LoanCommercialPayeeType;
    commercialPayeeSpecify?: string;
  }) => void;
  onTimeline: (note: string) => void;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
  /** BAT #23 — open Deal Documents → Lender Documents for this lender. */
  onOpenLenderDocuments?: (caseExecution: LoanLenderExecution) => void;
  /**
   * CO-ARCH-007 — Create/upsert EnterpriseDeal for the selected lender.
   * When provided, Identify Lender never appends snapshot-only cases.
   */
  onIdentifyLender?: (input: {
    lender: EnterpriseLenderRecord;
    program: EnterpriseLenderProgramRecord;
    expectedLoanAmount?: number;
    caseSubStage?: string;
  }) => Promise<void>;
  /** CO-UX-015 — notify when operator focuses a lender card (Action Center context). */
  onActiveCaseChange?: (caseExecution: LoanLenderExecution) => void;
}) {
  const loan = context;
  const [dragOverStage, setDragOverStage] = useState<LenderCaseStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addOpenInternal, setAddOpenInternal] = useState(false);
  const addDialogOpen = addOpen ?? addOpenInternal;
  const setAddDialogOpen = onAddOpenChange ?? setAddOpenInternal;

  const assignedRegistryIds = useMemo(
    () =>
      new Set(
        cases.map((c) => c.lenderRegistryId).filter((id): id is string => Boolean(id)),
      ),
    [cases],
  );
  const assignedLenders = useMemo(
    () => new Set(cases.map((c) => c.lender).filter(Boolean)),
    [cases],
  );

  const [pendingLender, setPendingLender] = useState<EnterpriseLenderRecord | null>(null);
  const [pendingProgram, setPendingProgram] = useState<EnterpriseLenderProgramRecord | null>(
    null,
  );

  const [disbursementCase, setDisbursementCase] = useState<WorkflowCase | null>(null);
  const [lostCase, setLostCase] = useState<WorkflowCase | null>(null);
  const [holdCase, setHoldCase] = useState<WorkflowCase | null>(null);
  const [loginProbeCase, setLoginProbeCase] = useState<WorkflowCase | null>(null);
  const [strategyCase, setStrategyCase] = useState<LoanLenderExecution | null>(null);

  const focusCase = (c: LoanLenderExecution | undefined | null) => {
    if (!c) return;
    onActiveCaseChange?.(c);
  };

  const [addForm, setAddForm] = useState<{
    lender: string;
    expectedLoanAmount: number;
    caseStage: LenderCaseStage;
    caseSubStage: string;
  }>({
    lender: "",
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
    setPendingLender(null);
    setPendingProgram(null);
    setAddForm((f) => ({
      ...f,
      lender: "",
      expectedLoanAmount: f.expectedLoanAmount || loan.requiredAmount,
    }));
  }, [addDialogOpen, loan.requiredAmount]);

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
    focusCase(cases.find((x) => x.id === caseId));
    tracePipelineDrag("drag_start", { caseId });
  };

  const handleDrop = (e: React.DragEvent, stage: LenderCaseStage) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData("text/plain");
    tracePipelineDrag("drop", { caseId, stage });
    if (!caseId) {
      tracePipelineDrag("error", { reason: "missing_case_id" });
      return;
    }
    const c = cases.find((x) => x.id === caseId);
    if (!c) {
      tracePipelineDrag("error", { reason: "case_not_found", caseId });
      return;
    }

    if (stage === "disbursed") {
      tracePipelineDrag("stage_validation", { gate: "disbursement_dialog", caseId, stage });
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
      tracePipelineDrag("stage_validation", { gate: "lost_dialog", caseId, stage });
      setLostCase({ ...c, targetStage: stage });
      setLostReason(c.lostReason ?? "rejected");
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }
    if (stage === "hold") {
      tracePipelineDrag("stage_validation", { gate: "hold_dialog", caseId, stage });
      setHoldCase({ ...c, targetStage: stage });
      setHoldForm({
        holdReason: c.holdReason ?? "",
        holdReviewDate: c.holdReviewDate ?? "",
      });
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }

    /** CO-UX-001 — Identified/Pre Login → Logged In: minimal Property Identified probe. */
    if (stage === "logged_in_wip" && !isLenderLoginProbeComplete(c)) {
      tracePipelineDrag("stage_validation", { gate: "login_probe", caseId, stage });
      setLoginProbeCase({ ...c, targetStage: stage });
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }

    // CO-UX-001 — Payee / Invoice Party is Accounting Stage — never block Pipeline drag.

    tracePipelineDrag("apply_move", { caseId, from: c.caseStage, to: stage });
    applyMove(caseId, stage);
  };

  const submitAddCase = () => {
    if (!pendingLender) {
      toast.error("Select a Lender from the Enterprise Lender Registry.");
      return;
    }
    if (!pendingProgram) {
      toast.error("Select a Lender Program belonging to the chosen Lender.");
      return;
    }
    const displayName = pendingLender.displayName || pendingLender.label;
    if (assignedLenders.has(displayName) || assignedRegistryIds.has(pendingLender.id)) {
      toast.error("This lender already has an Enterprise Deal on this Opportunity.");
      return;
    }

    const finishClose = () => {
      setAddDialogOpen(false);
      setPendingLender(null);
      setPendingProgram(null);
      setAddForm({
        lender: "",
        expectedLoanAmount: loan.requiredAmount,
        caseStage: "identified",
        caseSubStage: "",
      });
    };

    // CO-ARCH-007 — Prefer EnterpriseDeal create/upsert over snapshot append.
    if (onIdentifyLender) {
      void (async () => {
        try {
          await onIdentifyLender({
            lender: pendingLender,
            program: pendingProgram,
            expectedLoanAmount: addForm.expectedLoanAmount,
            caseSubStage: addForm.caseSubStage || undefined,
          });
          rememberDealLender({
            id: pendingLender.id,
            displayName,
            code: pendingLender.code,
          });
          onTimeline(
            `Enterprise Deal created: ${displayName} · Program ${pendingProgram.label}`,
          );
          finishClose();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to create Enterprise Deal";
          toast.error(message);
        }
      })();
      return;
    }

    const ts = nowIso();
    const next: LoanLenderExecution = {
      id: newId("lcase"),
      lender: displayName,
      lenderRef: `lender:${pendingLender.code}`,
      lenderCode: pendingLender.code,
      lenderLegalName: pendingLender.legalName ?? undefined,
      lenderDisplayName: displayName,
      lenderClassification: pendingLender.classification ?? undefined,
      lenderInstitutionCategory: pendingLender.institutionCategory ?? undefined,
      lenderWebsite: pendingLender.website ?? undefined,
      lenderCustomerCarePhone: pendingLender.customerCarePhone ?? undefined,
      lenderCustomerCareEmail: pendingLender.customerCareEmail ?? undefined,
      lenderHeadquarters: pendingLender.headquartersLabel ?? undefined,
      lenderRegistryId: pendingLender.id,
      lenderProgramId: pendingProgram.id,
      lenderProgramLabel: pendingProgram.label,
      status: "active",
      caseStage: "identified",
      caseSubStage: addForm.caseSubStage || undefined,
      expectedLoanAmount: addForm.expectedLoanAmount,
      product: loan.loanProduct,
      expectedRoi: pendingProgram.roiPercent ?? undefined,
      probability: "medium",
      isPrimary: cases.length === 0,
      relationshipManager: loan.relationshipManager,
      identifiedBy: updatedBy,
      identifiedAt: ts,
      reasonForRecommendation: "Identified from Enterprise Lender Registry",
      strategicRank:
        cases.filter((c) => normalizeLenderCaseStage(c.caseStage) === "identified").length + 1,
      createdBy: updatedBy,
      updatedBy,
      createdAt: ts,
      updatedAt: ts,
    };
    rememberDealLender({
      id: pendingLender.id,
      displayName,
      code: pendingLender.code,
    });
    onChange([next, ...cases]);
    onTimeline(
      `Lender identified: ${next.lender} · Program ${pendingProgram.label}${
        next.lenderCode ? ` (${next.lenderCode})` : ""
      }`,
    );
    finishClose();
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
    // CO-ARCH-005 — EDIE gate is LoanFile-shaped; Deal path records invoice intent without LoanFile.
    // Full Deal-native EDIE evaluation is a follow-on; do not revive LoanFile for this gate.
    if (disbursementForm.invoiceRaised) {
      toast.message("Invoice marked — complete EDIE compliance from Mission Control if required.");
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

  const confirmLoginProbe = (values: LenderLoginProbeValues) => {
    if (!loginProbeCase) return;
    applyMove(loginProbeCase.id, loginProbeCase.targetStage, buildLenderLoginProbePatch(values));
    setLoginProbeCase(null);
  };

  return (
    <div className="min-h-0 space-y-2">
      {/* CO-UX-020 / CO-UX-021 — Kanban primary surface; left edge inherits DEAL_WORKSPACE_PAD_X from host. */}
      <div className="h-[calc(100vh-11.5rem)] min-h-[520px] overflow-x-auto overflow-y-hidden scrollbar-thin">
        <div className="flex h-full w-full min-w-max gap-2 pb-1 pr-1">
          {LENDER_CASE_STAGES.map((col) => {
            const colCases = casesByStage.get(col.id) ?? [];
            const isDragOver = dragOverStage === col.id;
            return (
              <div
                key={col.id}
                className="flex h-full min-w-[148px] max-w-[220px] flex-1 flex-col"
                onDragOver={(e) => {
                  e.preventDefault();
                  // CO-PIPELINE-001 — avoid setState storm on every dragover pixel.
                  setDragOverStage((prev) => (prev === col.id ? prev : col.id));
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
                        context={loan}
                        stageLabel={col.label}
                        stageColor={LENDER_CASE_STAGE_COLORS[col.id]}
                        caseExecution={c}
                        probability={c.probability ?? "medium"}
                        onDragStart={handleDragStart}
                        onSetPrimary={() => setPrimary(c.id)}
                        onRemove={() => removeCase(c.id)}
                        onProbabilityChange={(p) => updateProbability(c.id, p)}
                        onStartLogin={() => startLogin(c.id)}
                        onViewStrategy={() => {
                          focusCase(c);
                          setStrategyCase(c);
                        }}
                        onOpenDocuments={
                          onOpenLenderDocuments
                            ? () => {
                                focusCase(c);
                                onOpenLenderDocuments(c);
                              }
                            : undefined
                        }
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

      {/* Identify Additional Lender — enterprise search + program (Phase 2B Sprint 2) */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {cases.length > 0 ? "Identify Additional Lender" : "Identify Lender"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <EnterpriseLenderSearch
              productCode={loan.productCode}
              productLabel={loan.loanProduct}
              loanProduct={loan.loanProduct}
              excludeLenderIds={[...assignedRegistryIds]}
              selectedLenderId={pendingLender?.id}
              selectedProgramId={pendingProgram?.id}
              onSelect={({ lender, program }) => {
                setPendingLender(lender);
                setPendingProgram(program ?? null);
                setAddForm((f) => ({
                  ...f,
                  lender: lender.displayName || lender.label,
                }));
              }}
              requireProgram
            />
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
            <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submitAddCase}
              disabled={!pendingLender || !pendingProgram}
              title={
                !pendingLender
                  ? "Select an eligible lender that is not already on this Opportunity"
                  : !pendingProgram
                    ? "Select a Lender Program"
                    : undefined
              }
            >
              Identify Lender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LenderStrategyDrawer
        open={Boolean(strategyCase)}
        onOpenChange={(open) => {
          if (!open) setStrategyCase(null);
        }}
        caseExecution={strategyCase}
        productFallback={loan.loanProduct}
      />

      <ChanakyaLenderLoginProbeDialog
        open={Boolean(loginProbeCase)}
        caseExecution={loginProbeCase}
        customerName={loan.customerName}
        onOpenChange={(open) => {
          if (!open) setLoginProbeCase(null);
        }}
        onComplete={confirmLoginProbe}
      />

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
  context: loan,
  stageLabel,
  stageColor,
  caseExecution,
  probability,
  onDragStart,
  onSetPrimary,
  onRemove,
  onProbabilityChange,
  onStartLogin,
  onViewStrategy,
  onOpenDocuments,
  onReorderUp,
  onReorderDown,
}: {
  context: DealPipelineContext;
  stageLabel: string;
  stageColor: string;
  caseExecution: LoanLenderExecution;
  probability: LenderProbability;
  onDragStart: (e: React.DragEvent, caseId: string) => void;
  onSetPrimary: () => void;
  onRemove: () => void;
  onProbabilityChange: (p: LenderProbability) => void;
  onStartLogin: () => void;
  onViewStrategy: () => void;
  onOpenDocuments?: () => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
}) {
  const stage = normalizeLenderCaseStage(caseExecution.caseStage);
  const identified = stage === "identified";
  const product = caseExecution.product ?? loan.loanProduct;
  const identifiedBy = caseExecution.identifiedBy ?? caseExecution.createdBy ?? "—";
  const identifiedDate = (caseExecution.identifiedAt ?? caseExecution.createdAt)
    ? new Date(caseExecution.identifiedAt ?? caseExecution.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

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
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onViewStrategy())}>
                  View Strategy
                </DropdownMenuItem>
                {onOpenDocuments ? (
                  <DropdownMenuItem onClick={(e) => (e.preventDefault(), onOpenDocuments())}>
                    Documents
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onReorderUp())}>
                  Reorder · Up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onReorderDown())}>
                  Reorder · Down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onViewStrategy())}>
                  View Strategy
                </DropdownMenuItem>
                {onOpenDocuments ? (
                  <DropdownMenuItem onClick={(e) => (e.preventDefault(), onOpenDocuments())}>
                    Documents
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
              </>
            )}
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
        {caseExecution.strategicRank != null ? (
          <Badge variant="outline" className="h-3.5 px-1 text-[8px] border border-indigo-500/30 text-indigo-700">
            Rank #{caseExecution.strategicRank}
          </Badge>
        ) : null}
      </div>

      <div className="mt-1 space-y-0 text-[9px] text-muted-foreground leading-snug">
        {caseExecution.expectedRoi != null ? (
          <p>Expected ROI {caseExecution.expectedRoi}%</p>
        ) : null}
        {caseExecution.reasonForRecommendation ? (
          <p className="line-clamp-2 text-foreground/80">{caseExecution.reasonForRecommendation}</p>
        ) : caseExecution.specialNotes ? (
          <p className="line-clamp-2 text-foreground/80">{caseExecution.specialNotes}</p>
        ) : null}
        <p>
          Identified by {identifiedBy} · {identifiedDate}
        </p>
      </div>

      {identified ? (
        <div className="mt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          <Button type="button" size="sm" className="h-6 px-1.5 text-[9px]" onClick={onStartLogin}>
            Start Login
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 px-1.5 text-[9px]"
            onClick={onViewStrategy}
          >
            View Strategy
          </Button>
          {onOpenDocuments ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-1.5 text-[9px]"
              onClick={onOpenDocuments}
            >
              Documents
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[9px] text-destructive"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 px-1.5 text-[9px]"
            onClick={onViewStrategy}
          >
            View Strategy
          </Button>
          {onOpenDocuments ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-1.5 text-[9px]"
              onClick={onOpenDocuments}
            >
              Documents
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
