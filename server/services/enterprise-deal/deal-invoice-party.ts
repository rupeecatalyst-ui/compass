/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Invoice Party (Deal attribute) rules.
 * Required stage is configurable via INVOICE_PARTY_REQUIRED_FROM_STAGE — not hard-coded here.
 */
import { DealValidationError } from "@server/services/enterprise-deal/deal-validation";
import {
  INVOICE_PARTY_REQUIRED_MESSAGE,
  invoicePartyRequiredToProgressTo,
  isInvoicePartyComplete,
  isValidInvoicePartyType,
} from "@/constants/invoice-party";

export {
  INVOICE_PARTY_REQUIRED_MESSAGE,
  invoicePartyRequiredToProgressTo as dealStageRequiresInvoiceParty,
  isInvoicePartyComplete as isDealInvoicePartyComplete,
  isValidInvoicePartyType,
};

/** Blocks Deal pipeline advance beyond the configured Invoice Party stage. */
export function assertInvoicePartyForDealStage(input: {
  toGrossStage: string;
  invoicePartyId?: string | null;
  /** @deprecated legacy */
  commissionAccountingPayeeId?: string | null;
}) {
  if (!invoicePartyRequiredToProgressTo(input.toGrossStage)) return;
  if (
    !isInvoicePartyComplete({
      invoicePartyId: input.invoicePartyId,
      commissionAccountingPayeeId: input.commissionAccountingPayeeId,
    })
  ) {
    throw new DealValidationError(
      INVOICE_PARTY_REQUIRED_MESSAGE,
      "INVOICE_PARTY_REQUIRED",
    );
  }
}

/** @deprecated */
export const COMMISSION_PAYER_REQUIRED_MESSAGE = INVOICE_PARTY_REQUIRED_MESSAGE;
/** @deprecated */
export const assertCommissionPayerForDealStage = assertInvoicePartyForDealStage;
/** @deprecated */
export const dealStageRequiresCommissionPayer = invoicePartyRequiredToProgressTo;
/** @deprecated */
export function isValidCommissionPayeeType(value: unknown) {
  return isValidInvoicePartyType(value);
}
/** @deprecated */
export function isDealCommissionPayerComplete(input: {
  commissionAccountingPayeeId?: string | null;
  invoicePartyId?: string | null;
}) {
  return isInvoicePartyComplete(input);
}
