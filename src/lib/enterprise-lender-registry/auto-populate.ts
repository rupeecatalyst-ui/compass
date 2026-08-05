/**
 * CO-ARCH-004 — Auto-populate master snapshot into Borrow / Deal transactions.
 * Transactions must never re-enter master fields; only commercial params stay local.
 */
import type {
  EnterpriseLenderContactRecord,
  EnterpriseLenderRecord,
  LenderMasterSnapshot,
} from "@/types/enterprise-lender-registry";

export function buildLenderMasterSnapshot(
  lender: EnterpriseLenderRecord,
  contacts: EnterpriseLenderContactRecord[] = [],
): LenderMasterSnapshot {
  return {
    lenderId: lender.id,
    lenderCode: lender.code,
    legalName: lender.legalName || lender.label,
    displayName: lender.displayName || lender.label,
    shortName: lender.shortName ?? null,
    classification: lender.classification ?? null,
    institutionCategory: lender.institutionCategory,
    website: lender.website ?? null,
    logoUrl: lender.logoUrl ?? null,
    brandName: lender.displayName || lender.label,
    customerCarePhone: lender.customerCarePhone ?? null,
    customerCareEmail: lender.customerCareEmail ?? null,
    headquartersLabel: lender.headquartersLabel ?? null,
    productsSupported: lender.productsSupported ?? [],
    defaultContacts: contacts
      .filter((c) => c.enabled && !c.isDeleted)
      .slice(0, 8)
      .map((c) => ({
        name: c.name,
        designation: c.designation ?? null,
        department: c.department,
        mobile: c.mobile ?? null,
        email: c.email ?? null,
      })),
  };
}

/** Fields operators may still maintain on a transaction after master auto-fill. */
export const LENDER_TRANSACTION_EDITABLE_FIELDS = [
  "product",
  "scheme",
  "roi",
  "processingFee",
  "eligibility",
  "tat",
  "internalNotes",
  "documents",
] as const;

export type LenderTransactionEditableField =
  (typeof LENDER_TRANSACTION_EDITABLE_FIELDS)[number];
