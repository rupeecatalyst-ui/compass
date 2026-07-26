/**
 * @deprecated Re-export — use `@/constants/invoice-party`.
 * Kept for Sprint 1 backward compatibility with commercial-payee imports.
 */
export {
  LOAN_COMMERCIAL_PAYEE_TYPES,
  LOAN_COMMERCIAL_PAYEE_OPTIONS,
  getCommercialPayeeLabel,
  type LoanCommercialPayeeType,
  INVOICE_PARTY_TYPES,
  INVOICE_PARTY_TYPE_OPTIONS,
  getInvoicePartyTypeLabel,
  type InvoicePartyType,
  INVOICE_PARTY_REQUIRED_MESSAGE,
  INVOICE_PARTY_REQUIRED_FROM_STAGE,
  requiresInvoiceParty,
  invoicePartyRequiredToProgressTo,
  isInvoicePartyComplete,
} from "@/constants/invoice-party";
