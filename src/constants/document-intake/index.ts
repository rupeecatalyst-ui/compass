/**
 * CO-DOC-ARCH-001 — Enterprise Document Intake channel map.
 *
 * Business vocabulary (WALK_IN / DIRECT / WEALTH_PARTNER) maps onto the
 * existing Document Registry `uploadSource` field — not a second store.
 */

import type { DocumentRegistryUploadSource } from "@/types/document-registry";

/** Canonical business intake channels (presentation / audit vocabulary). */
export const DOCUMENT_INTAKE_BUSINESS_CHANNELS = [
  "WALK_IN",
  "DIRECT",
  "WEALTH_PARTNER",
] as const;

export type DocumentIntakeBusinessChannel =
  (typeof DOCUMENT_INTAKE_BUSINESS_CHANNELS)[number];

/**
 * Maps business channel → existing Enterprise Document Registry uploadSource.
 * Do not introduce WealthPartnerDocument / CompassDocument / WalkInDocument tables.
 */
export const DOCUMENT_INTAKE_CHANNEL_TO_UPLOAD_SOURCE = {
  WALK_IN: "manual_upload",
  DIRECT: "customer_portal",
  WEALTH_PARTNER: "wealth_partner",
} as const satisfies Record<
  DocumentIntakeBusinessChannel,
  DocumentRegistryUploadSource
>;

export type DocumentIntakeMappedUploadSource =
  (typeof DOCUMENT_INTAKE_CHANNEL_TO_UPLOAD_SOURCE)[DocumentIntakeBusinessChannel];

/** Reverse map for audit / partner labels (unknown sources stay unclassified). */
export const DOCUMENT_UPLOAD_SOURCE_TO_BUSINESS_CHANNEL: Partial<
  Record<DocumentRegistryUploadSource, DocumentIntakeBusinessChannel>
> = {
  manual_upload: "WALK_IN",
  customer_portal: "DIRECT",
  wealth_partner: "WEALTH_PARTNER",
};

export function toDocumentUploadSource(
  channel: DocumentIntakeBusinessChannel,
): DocumentIntakeMappedUploadSource {
  return DOCUMENT_INTAKE_CHANNEL_TO_UPLOAD_SOURCE[channel];
}

export function resolveDocumentIntakeBusinessChannel(
  uploadSource: string | null | undefined,
): DocumentIntakeBusinessChannel | null {
  if (!uploadSource) return null;
  const mapped =
    DOCUMENT_UPLOAD_SOURCE_TO_BUSINESS_CHANNEL[
      uploadSource as DocumentRegistryUploadSource
    ];
  return mapped ?? null;
}

/**
 * Unclassified / supporting intake typeRef prefix.
 * Files may enter review without a forced checklist classification
 * (aligned with Document Center "Other Documents" / classify-upload).
 */
export const DOCUMENT_INTAKE_UNCLASSIFIED_TYPE_PREFIX = "doc:other:";

export const DOCUMENT_INTAKE_ARCHITECTURE_ID = "CO-DOC-ARCH-001";

/** CO-WP-DOC-002 / CO-WP-DOC-003 — Partner freeform intake modes (same Document SSOT). */
export const DOCUMENT_INTAKE_PARTNER_MODES = [
  "inbox",
  "additional",
  "requirement",
  "folder",
] as const;

export type DocumentIntakePartnerMode = (typeof DOCUMENT_INTAKE_PARTNER_MODES)[number];

export function isUnclassifiedDocumentTypeRef(
  typeRef: string | null | undefined,
): boolean {
  return Boolean(typeRef?.startsWith(DOCUMENT_INTAKE_UNCLASSIFIED_TYPE_PREFIX));
}

/**
 * Employee-facing intake caption. Wealth Partner channel = Catalyst Connect.
 * Does not invent partner names — those come from uploadedBy / partner metadata.
 */
export function documentRegistrySourceLabel(
  uploadSource: string | null | undefined,
): string {
  switch ((uploadSource || "").trim()) {
    case "wealth_partner":
      return "Catalyst Connect";
    case "folder_package":
      return "Document Package";
    case "customer_portal":
      return "Customer Portal";
    case "lender_portal":
      return "Lender Portal";
    case "manual_upload":
      return "Walk-in / Manual";
    case "email":
      return "Email";
    case "whatsapp":
      return "WhatsApp";
    case "api":
      return "API";
    case "conversation_activity":
      return "Conversation";
    default:
      return "Catalyst One";
  }
}

export function createUnclassifiedDocumentTypeRef(id?: string): string {
  const suffix =
    id?.trim() ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
  return `${DOCUMENT_INTAKE_UNCLASSIFIED_TYPE_PREFIX}${suffix}`;
}