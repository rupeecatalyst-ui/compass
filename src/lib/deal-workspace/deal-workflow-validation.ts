/**
 * CO-DWS-001 / CO-DWS-001C — Enterprise Deal Workflow Validation Service.
 * Blocking only when data integrity would be compromised.
 * Accounting (Invoice Party) is Action Center / readiness warning only —
 * never a Lender Pipeline stage-transition gate.
 */
import {
  INVOICE_PARTY_ACTION_CENTER_ACTION,
  INVOICE_PARTY_ACTION_CENTER_TITLE,
  INVOICE_PARTY_READINESS_HINT,
  INVOICE_PARTY_REQUIRED_MESSAGE,
  isInvoicePartyComplete,
} from "@/constants/invoice-party";
import type {
  DealReadinessCategoryId,
  DealReadinessItem,
  DealReadinessSnapshot,
  DealReadinessStatus,
  DealWorkflowValidationRule,
} from "@/types/deal-workflow-validation";

/** Canonical inventory — CO-DWS-001 / CO-DWS-001C. */
export const DEAL_WORKFLOW_VALIDATION_INVENTORY: readonly DealWorkflowValidationRule[] = [
  {
    id: "deal_missing_customer",
    name: "Primary customer / borrower identity",
    module: "Deal Workspace",
    businessPurpose: "Deal must reference a borrower for operational integrity.",
    triggerPoints: ["save_deal", "open_workspace"],
    severity: "blocking",
  },
  {
    id: "deal_missing_product",
    name: "Loan product",
    module: "Deal Workspace",
    businessPurpose: "Product drives underwriting and lender eligibility.",
    triggerPoints: ["save_deal"],
    severity: "blocking",
  },
  {
    id: "deal_missing_lender",
    name: "Lender registry selection",
    module: "Deal Edit / Identify Lender",
    businessPurpose: "One lender negotiation requires a registry lender.",
    triggerPoints: ["save_deal"],
    severity: "blocking",
  },
  {
    id: "deal_invalid_stage_transition",
    name: "Lender Pipeline stage transition rules",
    module: "Lender Pipeline",
    businessPurpose: "Prevent illegal stage jumps that corrupt Deal lifecycle.",
    triggerPoints: ["pipeline_stage_move"],
    severity: "blocking",
  },
  {
    id: "deal_invoice_party_accounting",
    name: "Invoice Party (Accounting Master)",
    module: "Accounting",
    businessPurpose:
      "Commission invoice requires an Invoice Party — only when performing accounting operations. Never blocks Lender Pipeline.",
    triggerPoints: ["accounting_operation", "action_center", "load_workspace"],
    severity: "warning",
    warningSurface: "action_center",
  },
  {
    id: "deal_commercial_profile_incomplete",
    name: "Commercial profile completeness",
    module: "Commercial",
    businessPurpose: "Commercial terms may be incomplete while execution continues.",
    triggerPoints: ["load_workspace", "action_center"],
    severity: "warning",
    warningSurface: "readiness_panel",
  },
  {
    id: "deal_optional_documents_pending",
    name: "Optional / pending documents",
    module: "Documents",
    businessPurpose: "Document gaps advise readiness; Document Center owns authoring.",
    triggerPoints: ["load_workspace", "document_upload"],
    severity: "warning",
    warningSurface: "health_card",
  },
  {
    id: "deal_chanakya_recommendations",
    name: "Chanakya operational recommendations",
    module: "CHANAKYA",
    businessPurpose: "Advisory mentoring — never blocks workflow.",
    triggerPoints: ["load_workspace", "action_center"],
    severity: "informational",
  },
] as const;

export type DealReadinessInput = {
  customerName?: string | null;
  loanProduct?: string | null;
  lenderId?: string | null;
  lenderProgramId?: string | null;
  grossStage?: string | null;
  invoicePartyId?: string | null;
  commissionAccountingPayeeId?: string | null;
  hasCriticalDocumentGaps?: boolean;
  /**
   * CO-BUG-001 — default false.
   * Accounting Invoice Party checks must NOT run during Deal Workspace load,
   * Save, Auto-Save, or Lender Pipeline stage moves.
   * Pass true only when composing Action Center accounting advisories.
   */
  includeAccountingReadiness?: boolean;
};

function worstStatus(a: DealReadinessStatus, b: DealReadinessStatus): DealReadinessStatus {
  const rank: Record<DealReadinessStatus, number> = {
    ready: 0,
    not_applicable: 0,
    attention: 1,
    blocked: 2,
  };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * Visual Deal Readiness — never throws; never blocks pipeline by itself.
 * CO-DWS-001C — missing Invoice Party → Action Center / strip warning only.
 */
export function deriveDealReadiness(input: DealReadinessInput): DealReadinessSnapshot {
  const items: DealReadinessItem[] = [];

  const customerOk = Boolean(input.customerName?.trim());
  items.push({
    categoryId: "customer",
    label: "Customer Ready",
    status: customerOk ? "ready" : "attention",
    message: customerOk
      ? "Borrower identity is present."
      : "Borrower display name is missing — confirm Contact linkage.",
    code: "DEAL_READINESS_CUSTOMER",
    actionLabel: customerOk ? undefined : "Open Contact",
  });

  const productOk = Boolean(input.loanProduct?.trim());
  items.push({
    categoryId: "commercial",
    label: "Commercial Ready",
    status: productOk ? "ready" : "attention",
    message: productOk
      ? "Loan product is captured."
      : "Loan product is not specified on this Deal.",
    code: "DEAL_READINESS_COMMERCIAL",
  });

  const lenderOk = Boolean(input.lenderId?.trim());
  items.push({
    categoryId: "lender",
    label: "Lender Ready",
    status: lenderOk ? "ready" : "attention",
    message: lenderOk
      ? "Lender is assigned from the Enterprise Lender Registry."
      : "Select a Lender to continue negotiation setup.",
    code: "DEAL_READINESS_LENDER",
    actionLabel: lenderOk ? undefined : "Select Lender",
  });

  const partyOk = isInvoicePartyComplete({
    invoicePartyId: input.invoicePartyId,
    commissionAccountingPayeeId: input.commissionAccountingPayeeId,
  });
  if (input.includeAccountingReadiness === true) {
    items.push({
      categoryId: "accounting",
      label: INVOICE_PARTY_ACTION_CENTER_TITLE,
      status: partyOk ? "ready" : "attention",
      message: partyOk
        ? "Invoice Party is assigned for commission invoicing."
        : INVOICE_PARTY_READINESS_HINT,
      code: "DEAL_READINESS_ACCOUNTING",
      actionLabel: partyOk ? undefined : INVOICE_PARTY_ACTION_CENTER_ACTION,
      actionHint:
        "Does not block Lender Pipeline or stage movement. Required only for invoice generation, commission booking, payment entry, and accounting posts.",
    });
  }

  items.push({
    categoryId: "documentation",
    label: "Documentation Ready",
    status: input.hasCriticalDocumentGaps ? "attention" : "ready",
    message: input.hasCriticalDocumentGaps
      ? "Critical documents are still pending in Document Center."
      : "No critical document gaps flagged for this Deal.",
    code: "DEAL_READINESS_DOCUMENTS",
    actionLabel: input.hasCriticalDocumentGaps ? "Open Document Center" : undefined,
  });

  items.push({
    categoryId: "compliance",
    label: "Compliance Ready",
    status: "ready",
    message: "No hard compliance blocks on Deal Workspace entry.",
    code: "DEAL_READINESS_COMPLIANCE",
  });

  const warnings = items.filter((i) => i.status === "attention");
  const blockers = items.filter((i) => i.status === "blocked");
  const overall = items.reduce<DealReadinessStatus>(
    (acc, i) => worstStatus(acc, i.status === "not_applicable" ? "ready" : i.status),
    "ready",
  );

  return {
    generatedAt: new Date().toISOString(),
    overall,
    items,
    warnings,
    blockers,
  };
}

export function getReadinessItem(
  snapshot: DealReadinessSnapshot,
  categoryId: DealReadinessCategoryId,
): DealReadinessItem | undefined {
  return snapshot.items.find((i) => i.categoryId === categoryId);
}

/** Accounting operations that MAY hard-require Invoice Party. */
export type AccountingOperationKind =
  | "invoice_generation"
  | "commission_booking"
  | "payment_entry"
  | "accounting_posting";

export function assertInvoicePartyForAccountingOperation(input: {
  operation: AccountingOperationKind;
  invoicePartyId?: string | null;
  commissionAccountingPayeeId?: string | null;
}): void {
  if (
    isInvoicePartyComplete({
      invoicePartyId: input.invoicePartyId,
      commissionAccountingPayeeId: input.commissionAccountingPayeeId,
    })
  ) {
    return;
  }
  const err = new Error(INVOICE_PARTY_REQUIRED_MESSAGE) as Error & {
    code: string;
    operation: AccountingOperationKind;
  };
  err.code = "INVOICE_PARTY_REQUIRED_FOR_ACCOUNTING";
  err.operation = input.operation;
  throw err;
}
