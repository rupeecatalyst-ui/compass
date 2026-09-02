"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, MoreHorizontal } from "lucide-react";
import { ROUTES } from "@/constants/routes";
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
import { resolvePolicyForProgram } from "@/lib/enterprise-lender-registry/resolve-program-policy";
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
import { DealControlPanel } from "@/components/catalyst-one/execution/deal-control-panel";
import {
  EnterpriseStageTransitionDialog,
  type EnterpriseStageTransitionConfirm,
} from "@/components/catalyst-one/shared/enterprise-stage-transition-dialog";
import { formatINR } from "@/lib/format-currency";
import { lenderSubStageLabel } from "@/constants/enterprise-stage-transition";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { EDC_EVENT_TYPES } from "@/constants/enterprise-dialogue-center/lifecycle";
import { saveConversationActivity } from "@/lib/enterprise-conversation-intelligence";
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
  dealHealthScoreKanbanTone,
  dealPriorityKanbanTone,
  DISBURSED_DATE_UNAVAILABLE_LABEL,
  formatKanbanCardDate,
  isPreExecutionStage,
  normalizeLenderCaseStage,
  resolveKanbanCardTimestampLines,
} from "@/constants/lender-pipeline";
import {
  isPostDisbursementConfirmationPending,
  LENDER_CONFIRMATION_PENDING_KANBAN_LABEL,
  POST_DISBURSEMENT_CONFIRMATION_STAGE,
  POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES,
} from "@/constants/post-disbursement-confirmation";
import { postDisbursementApiClient } from "@/lib/post-disbursement-confirmation/client";
import { enterpriseDealApiClient } from "@/lib/enterprise-deal/deal-api-client";
import type {
  LenderCaseStage,
  LenderLostReason,
  LenderPaymentStatus,
  LenderProbability,
  LoanLenderExecution,
} from "@/types/catalyst-one";
import { EnterpriseLenderSearch } from "@/components/catalyst-one/shared/enterprise-lender-search";
import { LenderSalesContactCapture } from "@/components/catalyst-one/execution/lender-sales-contact-capture";
import { rememberDealLender } from "@/lib/deal-workspace/recent-deal-lenders";
import {
  enrichLenderSalesContactOfficialEmail,
  LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE,
  salesContactHasOfficialEmail,
  type LenderSalesContactLink,
} from "@/lib/lender-sales-contact";
import { findOperationalEcmContactById } from "@/lib/enterprise-registry";
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
  onRemoveDeal,
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
    /** CO-LR-013 — Mandatory Sales Contact (Banker). */
    lenderSalesContact: {
      contactId: string;
      contactName: string;
      mobile?: string;
      designationId?: string;
      designationLabel?: string;
      officialEmail?: string;
      institutionId?: string;
      institutionLabel?: string;
    };
  }) => Promise<void>;
  /** CO-UX-015 — notify when operator focuses a lender card (Action Center context). */
  onActiveCaseChange?: (caseExecution: LoanLenderExecution) => void;
  /**
   * CO-QA-002 — Explicit EnterpriseDeal soft-delete (preferred over onChange filter).
   * Host must persist to Registry and only then update UI.
   */
  onRemoveDeal?: (dealId: string, card: LoanLenderExecution) => Promise<void>;
}) {
  const router = useRouter();
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
  const [pendingSalesContact, setPendingSalesContact] =
    useState<LenderSalesContactLink | null>(null);

  const [disbursementCase, setDisbursementCase] = useState<WorkflowCase | null>(null);
  const [lostCase, setLostCase] = useState<WorkflowCase | null>(null);
  const [holdCase, setHoldCase] = useState<WorkflowCase | null>(null);
  const [contextOverlay, setContextOverlay] = useState<Partial<DealPipelineContext>>({});
  const loan = { ...context, ...contextOverlay };
  const [loginProbeCase, setLoginProbeCase] = useState<WorkflowCase | null>(null);
  const [strategyCase, setStrategyCase] = useState<LoanLenderExecution | null>(null);
  /** CO-WF-006 — guided mid-stage transition dialog */
  const [transitionCase, setTransitionCase] = useState<WorkflowCase | null>(null);

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
    officialEmail: "",
  });
  const [disbursementEmailRequired, setDisbursementEmailRequired] = useState(false);
  const [disbursementBusy, setDisbursementBusy] = useState(false);

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
      const linked =
        (c.lenderSalesContactId
          ? findOperationalEcmContactById(c.lenderSalesContactId)
          : null) ?? null;
      const needsEmail =
        Boolean(c.lenderSalesContactId) && !salesContactHasOfficialEmail(linked) &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.lenderSalesContactOfficialEmail ?? "");
      setDisbursementEmailRequired(needsEmail);
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
        officialEmail:
          linked?.officialEmail?.trim() ||
          c.lenderSalesContactOfficialEmail?.trim() ||
          "",
      });
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }

    if (stage === POST_DISBURSEMENT_CONFIRMATION_STAGE) {
      toast.message(
        "Post-Disbursement Confirmation opens automatically three days after Disbursed.",
      );
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }

    if (normalizeLenderCaseStage(c.caseStage) === POST_DISBURSEMENT_CONFIRMATION_STAGE) {
      toast.message(
        "Use Confirmation Received on the card to complete lender confirmation.",
      );
      setDragOverStage(null);
      setDraggingId(null);
      return;
    }

    // `stage` is already narrowed away from disbursed / post_disbursement_confirmation above.
    if (normalizeLenderCaseStage(c.caseStage) === "disbursed") {
      toast.message(
        "Disbursed cases advance to Post-Disbursement Confirmation via the server timer.",
      );
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

    // CO-UX-001 / CO-DWS-001C — Payee / Invoice Party is Accounting only — never block Pipeline drag.

    // CO-REFINEMENT-003 — Operational drag/drop completes in one gesture (no sequential WF-006 gate).
    // Special gates above (Disbursed capture, Lost/Hold reasons, Login probe, PDC) remain.
    if (normalizeLenderCaseStage(c.caseStage) !== stage) {
      tracePipelineDrag("apply_move", {
        caseId,
        from: c.caseStage,
        to: stage,
        mode: "flexible_operational",
      });
      applyMove(caseId, stage);
      return;
    }

    tracePipelineDrag("apply_move", { caseId, from: c.caseStage, to: stage });
    applyMove(caseId, stage);
  };

  const confirmEnterpriseTransition = async (result: EnterpriseStageTransitionConfirm) => {
    if (!transitionCase) return;
    const caseId = transitionCase.id;
    applyMove(caseId, transitionCase.targetStage, {
      caseSubStage: result.toSubStageId ?? undefined,
      remarks: result.reason || transitionCase.remarks,
    });

    const dealId = transitionCase.enterpriseDealId || transitionCase.id;
    const oppId = transitionCase.opportunityId || loan.opportunityId;
    try {
      appendEdcTimelineEntry({
        contextRef: {
          type: oppId ? "opportunity" : "deal",
          id: oppId || dealId,
        },
        eventType: EDC_EVENT_TYPES.STAGE_CHANGE,
        title: `Stage: ${LENDER_CASE_STAGE_LABELS[normalizeLenderCaseStage(result.fromStage)] ?? result.fromStage} → ${result.toStageLabel}`,
        description: [
          `Previous sub-stage: ${lenderSubStageLabel(result.fromStage, result.fromSubStage) || "Not Specified"}`,
          `New sub-stage: ${result.toSubStageLabel || "Not Specified"}`,
          result.reason ? `Reason: ${result.reason}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        actorId: updatedBy,
        expandablePayload: {
          previousStage: result.fromStage,
          newStage: result.toStage,
          previousSubStage: result.fromSubStage,
          newSubStage: result.toSubStageId,
          dealId,
          opportunityId: oppId,
          reason: result.reason,
          source: "CO-WF-006",
        },
      });
    } catch {
      /* timeline must not block transition */
    }

    if (result.reason.trim()) {
      try {
        await saveConversationActivity({
          composer: {
            contextType: oppId ? "opportunity" : "deal",
            contextId: oppId || dealId,
            entityLabel: transitionCase.lender,
            opportunityId: oppId ?? null,
            dealId,
          },
          channel: "typed_note",
          title: `Stage transition · ${result.toStageLabel}`,
          bodyText: result.reason,
          actorUserId: updatedBy,
          actorLabel: updatedBy,
        });
      } catch {
        /* activity optional relative to stage move */
      }
    }

    setTransitionCase(null);
    toast.success(`Moved to ${result.toStageLabel}${result.toSubStageLabel ? ` · ${result.toSubStageLabel}` : ""}`);
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
    if (!pendingSalesContact?.contactId) {
      toast.error("Select or create a Lender Sales Contact before identifying the lender.");
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
      setPendingSalesContact(null);
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
            lenderSalesContact: {
              contactId: pendingSalesContact.contactId,
              contactName: pendingSalesContact.contactName,
              mobile: pendingSalesContact.mobile,
              designationId: pendingSalesContact.designationId,
              designationLabel: pendingSalesContact.designationLabel,
              officialEmail: pendingSalesContact.officialEmail,
              institutionId: pendingSalesContact.institutionId,
              institutionLabel: pendingSalesContact.institutionLabel,
            },
          });
          rememberDealLender({
            id: pendingLender.id,
            displayName,
            code: pendingLender.code,
          });
          onTimeline(
            `Enterprise Deal created: ${displayName} · Program ${pendingProgram.label} · Sales Contact ${pendingSalesContact.contactName}`,
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
      ...(() => {
        const r = resolvePolicyForProgram({ program: pendingProgram });
        return {
          creditRiskPolicyRef:
            r.policy?.policyId ?? pendingProgram.creditRiskPolicyRef ?? undefined,
          creditRiskPolicyLabel: r.policy
            ? `${r.policy.policyName} (${r.policy.policyCode})`
            : pendingProgram.creditRiskPolicyRef
              ? `Policy ref: ${pendingProgram.creditRiskPolicyRef}`
              : undefined,
        };
      })(),
      lenderSalesContactId: pendingSalesContact.contactId,
      lenderSalesContactName: pendingSalesContact.contactName,
      lenderSalesContactMobile: pendingSalesContact.mobile,
      lenderSalesContactDesignationId: pendingSalesContact.designationId,
      lenderSalesContactDesignationLabel: pendingSalesContact.designationLabel,
      lenderSalesContactOfficialEmail: pendingSalesContact.officialEmail,
      lenderSalesContactInstitutionId: pendingSalesContact.institutionId,
      lenderSalesContactInstitutionLabel: pendingSalesContact.institutionLabel,
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
      } · Sales Contact ${pendingSalesContact.contactName}`,
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

  const registryDeleteAvailable = typeof onRemoveDeal === "function";

  const removeCase = (id: string) => {
    const lender = cases.find((c) => c.id === id);
    if (!lender) return;
    const dealId = (lender.enterpriseDealId || lender.id || "").trim();

    tracePipelineDrag("delete_user_click", {
      cardId: id,
      dealId: dealId || null,
      lender: lender.lender,
      registryDeleteAvailable,
    });

    // CO-QA-002 Round 3 — never remove from React state without Registry persistence.
    if (!registryDeleteAvailable) {
      tracePipelineDrag("delete_blocked", {
        reason: "onRemoveDeal_undefined",
        cardId: id,
      });
      toast.error("Deal deletion is currently unavailable.");
      onTimeline(`Lender deal delete blocked (unavailable): ${lender.lender ?? id}`);
      return;
    }

    if (!dealId) {
      tracePipelineDrag("delete_blocked", {
        reason: "missing_enterprise_deal_id",
        cardId: id,
      });
      toast.error("Deal deletion is currently unavailable.");
      onTimeline(`Lender deal delete blocked (missing Deal id): ${lender.lender ?? id}`);
      return;
    }

    void (async () => {
      try {
        tracePipelineDrag("delete_callback_invoked", { dealId, lender: lender.lender });
        onTimeline(`Lender deal delete initiated: ${lender.lender}`);
        await onRemoveDeal(dealId, lender);
        tracePipelineDrag("delete_render_complete", { dealId });
      } catch (err) {
        tracePipelineDrag("delete_failed", {
          dealId,
          message: err instanceof Error ? err.message : String(err),
        });
        toast.error(
          err instanceof Error ? err.message : "Failed to delete lender deal",
        );
        // Card stays visible — onRemoveDeal must not mutate UI until Registry confirms.
      }
    })();
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
    void (async () => {
      setDisbursementBusy(true);
      try {
        let salesEmail = disbursementForm.officialEmail.trim();
        const contactId = disbursementCase.lenderSalesContactId?.trim();

        if (contactId) {
          const linked = findOperationalEcmContactById(contactId);
          const hasEmail =
            salesContactHasOfficialEmail(linked) ||
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              disbursementCase.lenderSalesContactOfficialEmail ?? "",
            );
          if (!hasEmail) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(salesEmail)) {
              toast.error(LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE);
              setDisbursementEmailRequired(true);
              return;
            }
            // Progressive enrichment — update existing ECM contact (never create another).
            const updated = await enrichLenderSalesContactOfficialEmail(
              contactId,
              salesEmail,
              updatedBy,
            );
            salesEmail =
              updated.officialEmail?.trim() ||
              updated.roleProfiles?.lender_employee?.officialEmail?.trim() ||
              salesEmail;
          } else {
            salesEmail =
              linked?.officialEmail?.trim() ||
              disbursementCase.lenderSalesContactOfficialEmail?.trim() ||
              salesEmail;
          }
        }

        // CO-ARCH-005 — EDIE gate is LoanFile-shaped; Deal path records invoice intent without LoanFile.
        if (disbursementForm.invoiceRaised) {
          toast.message(
            "Invoice marked — complete EDIE compliance from Mission Control if required.",
          );
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
          ...(contactId && salesEmail
            ? { lenderSalesContactOfficialEmail: salesEmail }
            : {}),
        });
        setDisbursementCase(null);
        setDisbursementEmailRequired(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE,
        );
      } finally {
        setDisbursementBusy(false);
      }
    })();
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

  const confirmPostDisbursementReceived = (caseId: string) => {
    const c = cases.find((x) => x.id === caseId);
    if (!c || !isPostDisbursementConfirmationPending({
      caseStage: c.caseStage,
      caseSubStage: c.caseSubStage,
    })) {
      return;
    }
    void (async () => {
      try {
        const dealId = (c.enterpriseDealId || c.id || "").trim();
        if (!dealId) {
          toast.error("Deal id is missing for confirmation.");
          return;
        }
        let rowVersion = c.enterpriseDealRowVersion;
        if (rowVersion == null) {
          const deal = await enterpriseDealApiClient.getDeal(dealId);
          rowVersion = deal.rowVersion;
        }
        if (rowVersion == null) {
          toast.error("Deal version is missing — reload the workspace and try again.");
          return;
        }
        const result = await postDisbursementApiClient.confirmReceived(dealId, {
          rowVersion,
        });
        applyMove(caseId, POST_DISBURSEMENT_CONFIRMATION_STAGE, {
          caseSubStage: POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received,
          enterpriseDealRowVersion: result.rowVersion,
        });
        toast.success(
          result.idempotentReplay
            ? "Confirmation already recorded — Accounting Case unchanged."
            : "Confirmation Received — Accounting Case activated.",
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to record confirmation",
        );
      }
    })();
  };

  const confirmLoginProbe = (values: LenderLoginProbeValues) => {
    if (!loginProbeCase) return;
    applyMove(loginProbeCase.id, loginProbeCase.targetStage, buildLenderLoginProbePatch(values));
    setLoginProbeCase(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-2">
      {/* CO-UX-022 — Kanban fills remaining viewport; columns scroll independently; chrome stays fixed. */}
      <div className="h-full min-h-0 flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
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
                        removeEnabled={registryDeleteAvailable}
                        onRemove={() => removeCase(c.id)}
                        onProbabilityChange={(p) => updateProbability(c.id, p)}
                        onStartLogin={() => startLogin(c.id)}
                        onViewStrategy={() => {
                          focusCase(c);
                          setStrategyCase(c);
                        }}
                        onOpenWorkspace={() => {
                          const dealId = c.enterpriseDealId || c.id;
                          if (!dealId || dealId.startsWith("pending-") || dealId.startsWith("lcase-")) {
                            toast.error("Deal Workspace is not available until the Deal is saved.");
                            return;
                          }
                          const opp = loan.opportunityId
                            ? `?opportunityId=${encodeURIComponent(loan.opportunityId)}`
                            : "";
                          router.push(
                            `${ROUTES.DEALS}/${encodeURIComponent(dealId)}${opp}`,
                          );
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
                        onConfirmReceived={() => confirmPostDisbursementReceived(c.id)}
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
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setPendingSalesContact(null);
          }
        }}
      >
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
                setPendingSalesContact(null);
                setAddForm((f) => ({
                  ...f,
                  lender: lender.displayName || lender.label,
                }));
              }}
              requireProgram
            />
            <LenderSalesContactCapture
              lenderId={pendingLender?.id}
              lenderName={pendingLender?.displayName || pendingLender?.label}
              lenderCode={pendingLender?.code}
              productCode={pendingProgram?.productCode ?? loan.productCode}
              value={pendingSalesContact}
              onChange={setPendingSalesContact}
              actorId={updatedBy}
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
              disabled={!pendingLender || !pendingProgram || !pendingSalesContact?.contactId}
              title={
                !pendingLender
                  ? "Select a lender from the Enterprise Lender Registry that is not already on this Opportunity"
                  : !pendingProgram
                    ? "Select a lender program"
                    : !pendingSalesContact?.contactId
                      ? "Select or create a Lender Sales Contact"
                      : undefined
              }
            >
              Identify Lender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DealControlPanel
        open={Boolean(strategyCase)}
        onOpenChange={(open) => {
          if (!open) setStrategyCase(null);
        }}
        caseExecution={strategyCase}
        context={loan}
        productFallback={loan.loanProduct}
        actorUserId={updatedBy}
        onContextPatch={(patch) => {
          setContextOverlay((prev) => ({ ...prev, ...patch }));
        }}
        onPatch={(caseId, patch) => {
          const next = cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  ...patch,
                  updatedBy,
                  updatedAt: nowIso(),
                }
              : c,
          );
          onChange(next);
          setStrategyCase((prev) =>
            prev && prev.id === caseId
              ? {
                  ...prev,
                  ...patch,
                  updatedBy,
                  updatedAt: nowIso(),
                }
              : prev,
          );
          const label = patch.caseStage
            ? `Deal control updated · ${cases.find((c) => c.id === caseId)?.lender ?? caseId} → ${LENDER_CASE_STAGE_LABELS[normalizeLenderCaseStage(patch.caseStage)]}`
            : `Deal control updated · ${cases.find((c) => c.id === caseId)?.lender ?? caseId}`;
          onTimeline(label);
        }}
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

      {/* CO-WF-006 — Guided stage transition (mid-stage Kanban moves) */}
      <EnterpriseStageTransitionDialog
        open={Boolean(transitionCase)}
        onOpenChange={(open) => {
          if (!open) setTransitionCase(null);
        }}
        engine="lender_pipeline"
        fromStage={normalizeLenderCaseStage(transitionCase?.caseStage)}
        fromStageLabel={
          LENDER_CASE_STAGE_LABELS[normalizeLenderCaseStage(transitionCase?.caseStage)] ??
          "Current"
        }
        fromSubStage={transitionCase?.caseSubStage}
        toStage={transitionCase?.targetStage ?? "identified"}
        toStageLabel={
          transitionCase
            ? LENDER_CASE_STAGE_LABELS[transitionCase.targetStage]
            : "Next"
        }
        recommendContext={{
          pendingDocumentCount: 0,
          pendingTaskCount: 0,
        }}
        activityComposer={{
          contextType: loan.opportunityId ? "opportunity" : "deal",
          contextId:
            loan.opportunityId ||
            transitionCase?.enterpriseDealId ||
            transitionCase?.id ||
            loan.dealId,
          entityLabel: transitionCase?.lender || loan.customerName || "Deal",
          opportunityId: loan.opportunityId ?? transitionCase?.opportunityId ?? null,
          dealId: transitionCase?.enterpriseDealId || transitionCase?.id || loan.dealId,
          customerName: loan.customerName,
          stage: transitionCase?.targetStage,
        }}
        actorUserId={updatedBy}
        actorLabel={updatedBy}
        onConfirm={confirmEnterpriseTransition}
      />

      {/* Disbursement workflow */}
      <Dialog open={Boolean(disbursementCase)} onOpenChange={(o) => !o && setDisbursementCase(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Disbursement Details — {disbursementCase?.lender}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            {disbursementCase?.lenderSalesContactId ? (
              <div className="sm:col-span-2 rounded-md border border-border bg-muted/20 px-2.5 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Sales Contact</p>
                <p className="text-xs font-medium">
                  {disbursementCase.lenderSalesContactName || "Linked contact"}
                  {disbursementCase.lenderSalesContactMobile
                    ? ` · ${disbursementCase.lenderSalesContactMobile}`
                    : ""}
                </p>
                {disbursementEmailRequired ? (
                  <div className="mt-2 space-y-1">
                    <Label className="text-[11px] text-destructive">
                      Official Email Address *
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      {LENDER_SALES_CONTACT_DISBURSAL_EMAIL_MESSAGE}
                    </p>
                    <Input
                      type="email"
                      className="h-8 text-xs"
                      value={disbursementForm.officialEmail}
                      onChange={(e) =>
                        setDisbursementForm((f) => ({ ...f, officialEmail: e.target.value }))
                      }
                      placeholder="name@lender.com"
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {disbursementForm.officialEmail ||
                      disbursementCase.lenderSalesContactOfficialEmail ||
                      "Official email on file"}
                  </p>
                )}
              </div>
            ) : null}
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
            <Button
              type="button"
              size="sm"
              disabled={disbursementBusy}
              onClick={confirmDisbursement}
            >
              {disbursementBusy ? "Saving…" : "Complete Disbursement"}
            </Button>
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

function resolveStageExpectedDate(
  stage: LenderCaseStage,
  caseExecution: LoanLenderExecution,
): { label: string; value: string } | null {
  const login = formatKanbanCardDate(caseExecution.loginDate);
  const disbursement = formatKanbanCardDate(caseExecution.disbursementDate);
  if (
    stage === "identified" ||
    stage === "prelogin" ||
    stage === "logged_in_wip"
  ) {
    return login ? { label: "Expected Login", value: login } : null;
  }
  if (
    stage === "soft_approved" ||
    stage === "final_approved" ||
    stage === "closure_wip"
  ) {
    return disbursement
      ? { label: "Expected Disbursement", value: disbursement }
      : null;
  }
  return null;
}

function LenderCaseKanbanCard({
  context: loan,
  stageLabel,
  stageColor,
  caseExecution,
  probability,
  onDragStart,
  onSetPrimary,
  removeEnabled,
  onRemove,
  onProbabilityChange,
  onStartLogin,
  onViewStrategy,
  onOpenWorkspace,
  onOpenDocuments,
  onReorderUp,
  onReorderDown,
  onConfirmReceived,
}: {
  context: DealPipelineContext;
  stageLabel: string;
  stageColor: string;
  caseExecution: LoanLenderExecution;
  probability: LenderProbability;
  onDragStart: (e: React.DragEvent, caseId: string) => void;
  onSetPrimary: () => void;
  /** CO-QA-002 — false when Registry soft-delete callback is not wired. */
  removeEnabled: boolean;
  onRemove: () => void;
  onProbabilityChange: (p: LenderProbability) => void;
  onStartLogin: () => void;
  onViewStrategy: () => void;
  onOpenWorkspace: () => void;
  onOpenDocuments?: () => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
  onConfirmReceived: () => void;
}) {
  const stage = normalizeLenderCaseStage(caseExecution.caseStage);
  const identified = stage === "identified";
  const confirmationPending = isPostDisbursementConfirmationPending({
    caseStage: caseExecution.caseStage,
    caseSubStage: caseExecution.caseSubStage,
  });
  const product = caseExecution.product ?? loan.loanProduct;
  const loanAmount = caseExecution.expectedLoanAmount ?? loan.requiredAmount ?? 0;
  const loanAmountLabel = loanAmount > 0 ? formatINR(loanAmount) : null;
  const salesContactName = caseExecution.lenderSalesContactName?.trim() || "";
  const internalRm = loan.relationshipManager?.trim() || "—";
  const health = dealHealthScoreKanbanTone(caseExecution.dealHealthScore);
  const priorityTone = dealPriorityKanbanTone(caseExecution.dealPriority);
  const cardTimestamps = resolveKanbanCardTimestampLines({
    caseStage: caseExecution.caseStage,
    updatedAt: caseExecution.updatedAt,
    disbursedAt: caseExecution.disbursedAt,
  });
  const expectedDate = resolveStageExpectedDate(stage, caseExecution);
  const subStage =
    lenderSubStageLabel(stage, caseExecution.caseSubStage) ||
    caseExecution.caseSubStage ||
    "—";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, caseExecution.id)}
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-grab active:cursor-grabbing rounded-md border border-border bg-card/95",
        "border-l-[3px] shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
        /* ~35–40% taller information density — width unchanged */
        "p-2",
      )}
      style={{ borderLeftColor: stageColor }}
    >
      {/* HEADER — Institution · Product · Deal Score */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <LenderLogo lender={caseExecution.lender} size="lg" className="mt-0.5 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-tight text-foreground">
              {caseExecution.lender}
            </p>
            <p className="truncate text-[10px] font-medium leading-snug text-foreground/80">
              {product || "Product not specified"}
            </p>
            {loanAmountLabel ? (
              <p
                className="mt-0.5 truncate text-[12px] font-bold tabular-nums tracking-tight text-foreground"
                title="Deal loan amount (Enterprise Deal Registry)"
              >
                {loanAmountLabel}
              </p>
            ) : null}
            <p
              className={cn(
                "mt-0.5 flex items-center gap-1 text-[11px] font-semibold tabular-nums",
                health.className,
              )}
              title="Deal Health Score (Enterprise Deal Registry)"
            >
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", health.dot)} />
              {health.label}
            </p>
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
                  Deal Control
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onOpenWorkspace())}>
                  Workspace
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
                  Deal Control
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => (e.preventDefault(), onOpenWorkspace())}>
                  Workspace
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
              <p className="mb-1 text-[10px] uppercase text-muted-foreground">Success Probability</p>
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
            {removeEnabled ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => (e.preventDefault(), onRemove())}
              >
                Remove
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled
                className="text-muted-foreground"
                title="Deal deletion is currently unavailable."
              >
                Deal deletion is currently unavailable.
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* CURRENT STATUS — Stage · Sub-stage */}
      <div className="mt-2 space-y-0.5">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className="h-4 px-1.5 text-[9px] font-semibold"
            style={{ borderColor: stageColor, color: stageColor }}
          >
            {stageLabel}
          </Badge>
          <span className="truncate text-[10px] font-medium text-foreground" title={subStage}>
            {subStage}
          </span>
        </div>
        {confirmationPending ? (
          <p
            className="mt-1 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400"
            title="The three-day post-disbursement period has elapsed and lender confirmation is now required."
          >
            {LENDER_CONFIRMATION_PENDING_KANBAN_LABEL}
          </p>
        ) : null}
      </div>

      {/* OPERATIONAL — Lender Sales Contact · Internal RM */}
      <div className="mt-2 space-y-1 text-[10px] leading-snug">
        <div className="min-w-0">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
            Lender Sales Contact
          </p>
          {salesContactName ? (
            <p className="truncate font-medium text-foreground">{salesContactName}</p>
          ) : (
            <p className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              Not Assigned
            </p>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
            Internal RM
          </p>
          <p className="truncate font-medium text-foreground">{internalRm}</p>
        </div>
      </div>

      {/* TIMELINE — Disbursed (canonical) · Updated (persistence) · stage expected date */}
      <div className="mt-2 space-y-0.5 text-[10px] leading-snug max-md:block md:hidden lg:block">
        {cardTimestamps.showDisbursedDate ? (
          <p>
            {cardTimestamps.disbursedValue === DISBURSED_DATE_UNAVAILABLE_LABEL ? (
              <span className="font-medium text-foreground">
                {cardTimestamps.disbursedValue}
              </span>
            ) : (
              <>
                <span className="text-muted-foreground">Disbursed </span>
                <span className="font-medium text-foreground">
                  {cardTimestamps.disbursedValue}
                </span>
              </>
            )}
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">Updated </span>
          <span className="font-medium text-foreground">{cardTimestamps.updatedLabel}</span>
        </p>
        {expectedDate ? (
          <p>
            <span className="text-muted-foreground">{expectedDate.label} </span>
            <span className="font-medium text-foreground">{expectedDate.value}</span>
          </p>
        ) : null}
      </div>

      {/* PRIORITY */}
      <div className="mt-2 flex items-center gap-1">
        <Badge
          variant="outline"
          className={cn("h-4 px-1.5 text-[9px] font-semibold", priorityTone.className)}
        >
          {priorityTone.label}
        </Badge>
        {caseExecution.strategicRank != null ? (
          <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-indigo-500/30 text-indigo-700">
            Rank #{caseExecution.strategicRank}
          </Badge>
        ) : null}
      </div>

      {/* QUICK ACTIONS — Deal Control + Workspace */}
      <div className="mt-2 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
        {identified ? (
          <Button type="button" size="sm" className="h-6 px-1.5 text-[9px]" onClick={onStartLogin}>
            Start Login
          </Button>
        ) : null}
        {confirmationPending ? (
          <Button
            type="button"
            size="sm"
            className="h-6 px-1.5 text-[9px] bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirmReceived}
          >
            Confirmation Received
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-1.5 text-[9px]"
          onClick={onViewStrategy}
        >
          Deal Control
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-1.5 text-[9px]"
          onClick={onOpenWorkspace}
        >
          Workspace
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
    </div>
  );
}
