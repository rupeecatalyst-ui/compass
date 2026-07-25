/**
 * BAT #23 — Lender-specific documents in Deal / Lender Pipeline Documents tab.
 * Stored in the canonical Document Registry under documentScope "lender" + lenderId.
 * Must not mix with customer KYC / Shared Opportunity documents.
 */

export const LENDER_DOCUMENT_CATEGORY_LABEL = "Lender Documents";

export type LenderDocumentTypeDef = {
  typeRef: string;
  label: string;
  description: string;
};

/** Canonical checklist of lender-execution documents (uploadable from Deal Documents). */
export const LENDER_PIPELINE_DOCUMENT_TYPES: readonly LenderDocumentTypeDef[] = [
  {
    typeRef: "doc:lender-sanction-letter",
    label: "Sanction Letter",
    description: "Final or conditional sanction from the lender",
  },
  {
    typeRef: "doc:lender-sanction-conditions",
    label: "Sanction Conditions",
    description: "Conditions precedent / special conditions",
  },
  {
    typeRef: "doc:lender-login-acknowledgement",
    label: "Login Acknowledgement",
    description: "Lender login / file acknowledgement",
  },
  {
    typeRef: "doc:lender-legal-opinion",
    label: "Legal Opinion",
    description: "Legal title / opinion report",
  },
  {
    typeRef: "doc:lender-technical-valuation",
    label: "Technical Valuation",
    description: "Technical / valuation report",
  },
  {
    typeRef: "doc:lender-disbursement-advice",
    label: "Disbursement Advice",
    description: "Disbursement advice or release note",
  },
  {
    typeRef: "doc:lender-correspondence",
    label: "Lender Correspondence",
    description: "Other lender-specific correspondence",
  },
] as const;

export function isLenderDocumentTypeRef(typeRef: string): boolean {
  return typeRef.startsWith("doc:lender-");
}

export function isLenderDocumentRecord(links: {
  documentScope?: string;
  lenderId?: string;
  typeRef?: string;
}): boolean {
  if (links.documentScope === "lender") return true;
  if (links.typeRef && isLenderDocumentTypeRef(links.typeRef)) return true;
  return false;
}

/** Stable Deal+Lender storage key for Lender Documents (prefer registry id). */
export function resolveLenderDocumentsKey(lender: {
  id: string;
  lenderRegistryId?: string;
  lenderRef?: string;
  lenderCode?: string;
}): string {
  return (
    lender.lenderRegistryId?.trim() ||
    lender.lenderRef?.trim() ||
    lender.lenderCode?.trim() ||
    lender.id
  );
}
