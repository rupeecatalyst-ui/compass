/**
 * CO-WP-INT-002 — Partner projections from Enterprise Document + Business Notes SSOTs.
 * Gateway ownership must be proven by the caller before using these helpers.
 * CO-DOC-ARCH-001 — stamps WEALTH_PARTNER via existing uploadSource (no parallel store).
 */
import { randomUUID } from "node:crypto";
import { toDocumentUploadSource } from "@/constants/document-intake";
import { enterpriseBusinessNotesService } from "@server/services/enterprise-business-notes/enterprise-business-notes.service";
import {
  enterpriseTransactionDocumentService,
  type DurableDocumentDto,
} from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import type {
  PartnerOpportunityActivityDto,
  PartnerOpportunityDocumentDto,
  PartnerNoteEntryDto,
} from "@/types/enterprise-partner-business";

const WEALTH_PARTNER_UPLOAD_SOURCE = toDocumentUploadSource("WEALTH_PARTNER");

const PARTNER_HIDDEN_NOTE_CATEGORIES = new Set([
  "internal_discussion",
  "internal",
  "management",
  "credit_internal",
  "ops_internal",
]);

function documentStatusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("reject")) return "Rejected";
  if (s.includes("reupload") || s.includes("re_upload")) return "Re-upload Required";
  if (s.includes("verif") || s === "pending") return "Pending Verification";
  if (s === "verified" || s === "complete") return "Verified";
  if (s === "active" || s.includes("upload")) return "Uploaded";
  return status || "Uploaded";
}

export function mapDurableDocToPartner(
  row: DurableDocumentDto,
): PartnerOpportunityDocumentDto {
  return {
    documentId: row.id,
    title: row.displayName || row.originalFilename,
    statusLabel: documentStatusLabel(row.status),
    categoryLabel: row.categoryLabel,
    typeRef: row.typeRef,
    fileName: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.fileSizeBytes,
    previewDataUrl:
      row.hasContent && row.contentBase64 && row.mimeType?.startsWith("image/")
        ? `data:${row.mimeType};base64,${row.contentBase64}`
        : null,
    uploadedByLabel:
      row.uploadSource === WEALTH_PARTNER_UPLOAD_SOURCE
        ? "Wealth Partner"
        : row.uploadedBy || "Catalyst One",
    updatedAt: row.updatedAt,
    dtoSource: "enterprise_opportunity_registry",
  };
}

export async function listPartnerOpportunityDocuments(input: {
  organizationId: string;
  opportunityId: string;
}): Promise<PartnerOpportunityDocumentDto[]> {
  try {
    const rows = await enterpriseTransactionDocumentService.listByOpportunityForOrganization(
      input.organizationId,
      input.opportunityId,
      { includeContent: false },
    );
    return rows.map(mapDurableDocToPartner);
  } catch {
    return [];
  }
}

export async function upsertPartnerOpportunityDocument(input: {
  organizationId: string;
  opportunityId: string;
  opportunityNumber?: string | null;
  contactId?: string | null;
  typeRef: string;
  categoryLabel: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string | null;
  replaceDocumentId?: string | null;
  uploadedBy: string;
}): Promise<PartnerOpportunityDocumentDto> {
  const clientRecordId =
    input.replaceDocumentId?.trim() ||
    `wp-${input.opportunityId}-${input.typeRef}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

  const raw = input.contentBase64?.trim() || null;
  const contentBase64 =
    raw && raw.includes(",") ? raw.split(",").pop() || null : raw;

  const row = await enterpriseTransactionDocumentService.upsertForOrganization(
    input.organizationId,
    {
      opportunityId: input.opportunityId,
      opportunityNumber: input.opportunityNumber ?? null,
      clientRecordId,
      contactId: input.contactId ?? null,
      customerId: input.contactId ?? null,
      documentScope: "shared",
      typeRef: input.typeRef,
      categoryLabel: input.categoryLabel,
      originalFilename: input.fileName,
      displayName: input.title,
      mimeType: input.mimeType || "application/octet-stream",
      fileSizeBytes: Math.max(0, Math.round(input.sizeBytes || 0)),
      status: "active",
      uploadSource: WEALTH_PARTNER_UPLOAD_SOURCE,
      uploadedBy: input.uploadedBy,
      contentBase64,
    },
  );
  return mapDurableDocToPartner(row);
}

export async function softDeletePartnerOpportunityDocument(input: {
  organizationId: string;
  opportunityId: string;
  documentId: string;
}): Promise<boolean> {
  return enterpriseTransactionDocumentService.softDeleteForOrganization(input);
}

function isPartnerVisibleNote(category: string | null | undefined): boolean {
  const c = (category || "general").toLowerCase();
  if (PARTNER_HIDDEN_NOTE_CATEGORIES.has(c)) return false;
  if (c.startsWith("internal")) return false;
  return true;
}

export async function listPartnerVisibleOpportunityNotes(input: {
  opportunityId: string;
  contactId?: string | null;
}): Promise<{
  activities: PartnerOpportunityActivityDto[];
  noteEntries: PartnerNoteEntryDto[];
}> {
  if (!enterpriseBusinessNotesService.isDurable()) {
    return { activities: [], noteEntries: [] };
  }
  try {
    const notes = await enterpriseBusinessNotesService.list({
      opportunityId: input.opportunityId,
      limit: 80,
    });
    const visible = notes.filter((n) => isPartnerVisibleNote(n.category));
    const activities: PartnerOpportunityActivityDto[] = visible.map((n) => ({
      activityId: n.id,
      title: n.category === "general" ? "Notepad" : n.category,
      kindLabel: n.category || "Notepad",
      occurredAt: n.createdAt,
      body: n.body,
      dtoSource: "enterprise_opportunity_registry",
    }));
    const noteEntries: PartnerNoteEntryDto[] = visible.map((n) => ({
      noteId: n.id,
      body: n.body,
      authorLabel: n.createdByName || "Partner",
      occurredAt: n.createdAt,
      dtoSource: "enterprise_opportunity_registry",
    }));
    return { activities, noteEntries };
  } catch {
    return { activities: [], noteEntries: [] };
  }
}

export { isPartnerVisibleNote };
