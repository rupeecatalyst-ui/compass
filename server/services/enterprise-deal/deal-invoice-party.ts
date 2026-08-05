/**
 * CO-ARCH-003 Phase 2B Sprint 1 / CO-DWS-001 / CO-DWS-001C — Invoice Party rules.
 * Lender Pipeline transitions are never blocked by Invoice Party / Accounting.
 * Accounting operations use assertInvoicePartyForAccountingOperation only.
 */
import { DealValidationError } from "@server/services/enterprise-deal/deal-validation";
import {
  INVOICE_PARTY_REQUIRED_MESSAGE,
  assertInvoicePartyForAccountingOperation as assertPartyAccountingClient,
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

/**
 * @deprecated CO-DWS-001 — no-op for Lender Pipeline. Kept for call-site compatibility.
 * Prefer assertInvoicePartyForAccountingOperation.
 */
export function assertInvoicePartyForDealStage(_input: {
  toGrossStage: string;
  invoicePartyId?: string | null;
  commissionAccountingPayeeId?: string | null;
}) {
  // Intentionally empty — Invoice Party must not block stage movement.
}

/** Hard gate for accounting workflows only. */
export function assertInvoicePartyForAccountingOperation(input: {
  invoicePartyId?: string | null;
  commissionAccountingPayeeId?: string | null;
  operation?: string;
}) {
  try {
    assertPartyAccountingClient(input);
  } catch {
    throw new DealValidationError(
      INVOICE_PARTY_REQUIRED_MESSAGE,
      "INVOICE_PARTY_REQUIRED_FOR_ACCOUNTING",
    );
  }
}

/** @deprecated */
export const COMMISSION_PAYER_REQUIRED_MESSAGE = INVOICE_PARTY_REQUIRED_MESSAGE;
/** @deprecated — no-op */
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
