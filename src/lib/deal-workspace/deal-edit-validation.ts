/**
 * CO-ARCH-003 Phase 2B Sprint 2 — Deal edit / progression validation.
 */
import { isInvoicePartyComplete } from "@/constants/invoice-party";

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
  if (input.requireInvoiceParty !== false) {
    if (
      !isInvoicePartyComplete({
        invoicePartyId: input.invoicePartyId,
        commissionAccountingPayeeId: input.commissionAccountingPayeeId,
      })
    ) {
      issues.push({
        field: "invoicePartyId",
        message:
          "This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.",
      });
    }
  }
  const amount = input.requestedAmount ?? input.loanAmount;
  if (amount == null || !(Number(amount) > 0)) {
    issues.push({
      field: "requestedAmount",
      message: "Loan Amount is required.",
    });
  }
  return issues;
}
