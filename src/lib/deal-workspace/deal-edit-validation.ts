/**
 * CO-ARCH-003 Phase 2B Sprint 2 / CO-DWS-001 / CO-BUG-001 — Deal edit validation.
 * Invoice Party is NEVER validated here — use assertInvoicePartyForAccountingOperation
 * for invoice / commission / payment / posting only.
 */

export type DealEditValidationInput = {
  lenderId?: string | null;
  lenderProgramId?: string | null;
  invoicePartyId?: string | null;
  commissionAccountingPayeeId?: string | null;
  requestedAmount?: number | null;
  loanAmount?: number | null;
  interestRate?: number | null;
  tenure?: number | null;
  requireProgram?: boolean;
  /**
   * @deprecated CO-BUG-001 — ignored. Invoice Party is not validated on Deal edit/save.
   */
  requireInvoiceParty?: boolean;
};

export type DealEditValidationIssue = {
  field: string;
  message: string;
};

export function validateDealEditFields(
  input: DealEditValidationInput,
): DealEditValidationIssue[] {
  const issues: DealEditValidationIssue[] = [];
  if (!input.lenderId?.trim()) {
    issues.push({
      field: "lenderId",
      message: "Select a Lender from the Enterprise Lender Registry.",
    });
  }
  if (input.requireProgram !== false && !input.lenderProgramId?.trim()) {
    issues.push({
      field: "lenderProgramId",
      message: "Select a Lender Program belonging to the chosen Lender.",
    });
  }
  // CO-BUG-001 — requireInvoiceParty intentionally ignored (no accounting gate on Deal edit).
  const amount = input.requestedAmount ?? input.loanAmount;
  if (amount == null || !(Number(amount) > 0)) {
    issues.push({
      field: "requestedAmount",
      message: "Loan Amount is required.",
    });
  }
  return issues;
}
