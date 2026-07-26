/**
 * CO-ARCH-003 Phase 2B S1 — Invoice Party helpers (Deal attribute).
 * Distinct from Intelligent Payee Capture (disbursement recipient).
 * Deal selection source: Accounting Invoice Party Master only.
 */

import {
  INVOICE_PARTY_REQUIRED_MESSAGE,
  getInvoicePartyTypeLabel,
  isInvoicePartyComplete as isMasterInvoicePartyComplete,
  requiresInvoiceParty,
  type InvoicePartyType,
  type LoanCommercialPayeeType,
} from "@/constants/invoice-party";
import type { LoanFile, PipelineStage } from "@/types/catalyst-one";

export type { LoanCommercialPayeeType, InvoicePartyType };
export {
  INVOICE_PARTY_REQUIRED_MESSAGE,
  requiresInvoiceParty,
  INVOICE_PARTY_REQUIRED_FROM_STAGE,
  invoicePartyRequiredToProgressTo,
} from "@/constants/invoice-party";

/** @deprecated use requiresInvoiceParty */
export const requiresCommercialPayee = requiresInvoiceParty;
/** @deprecated */
export const requiresCommissionPayer = requiresInvoiceParty;

export function isInvoicePartyLocked(
  stage: PipelineStage | string,
  opts?: { allowAuthorizedEdit?: boolean },
): boolean {
  if (opts?.allowAuthorizedEdit) return false;
  return requiresInvoiceParty(stage);
}

/** @deprecated */
export const isCommercialPayeeLocked = isInvoicePartyLocked;

export function isInvoicePartyAssigned(
  file: Pick<
    LoanFile,
    "invoicePartyId" | "commissionAccountingPayeeId" | "commercialPayee" | "commercialPayeeSpecify"
  >,
): boolean {
  return isMasterInvoicePartyComplete({
    invoicePartyId: file.invoicePartyId,
    commissionAccountingPayeeId: file.commissionAccountingPayeeId,
  });
}

/** @deprecated */
export const isCommercialPayeeComplete = isInvoicePartyAssigned;
/** @deprecated */
export const isCommissionPayerComplete = isInvoicePartyAssigned;

export function formatInvoicePartyDisplay(
  file: Pick<
    LoanFile,
    | "invoicePartyLabel"
    | "invoicePartyId"
    | "commissionAccountingPayeeLabel"
    | "commissionAccountingPayeeId"
    | "commercialPayee"
    | "commercialPayeeSpecify"
  >,
): string {
  if (file.invoicePartyLabel?.trim()) return file.invoicePartyLabel.trim();
  if (file.commissionAccountingPayeeLabel?.trim()) {
    return file.commissionAccountingPayeeLabel.trim();
  }
  if (
    (file.invoicePartyId || file.commissionAccountingPayeeId) &&
    file.commercialPayeeSpecify?.trim()
  ) {
    return file.commercialPayeeSpecify.trim();
  }
  if (!file.commercialPayee) return "—";
  const label = getInvoicePartyTypeLabel(file.commercialPayee) ?? file.commercialPayee;
  if (file.commercialPayee === "other") {
    const specify = file.commercialPayeeSpecify?.trim();
    return specify ? `Other · ${specify}` : "Other (unspecified)";
  }
  return label;
}

/** @deprecated */
export const formatCommercialPayeeDisplay = formatInvoicePartyDisplay;
/** @deprecated */
export const formatCommissionPayerDisplay = formatInvoicePartyDisplay;
