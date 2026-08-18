/**
 * CO-WP-INT-002 — Partner projections from Enterprise Document + Business Notes SSOTs.
 * Gateway ownership must be proven by the caller before using these helpers.
 * CO-DOC-ARCH-001 — stamps WEALTH_PARTNER via existing uploadSource (no parallel store).
 */
import { randomUUID } from "node:crypto";
import {
  documentRegistrySourceLabel,
  toDocumentUploadSource,
} from "@/constants/document-intake";
import { enterpriseBusinessNotesService } from "@server/services/enterprise-business-notes/enterprise-business-notes.service";
import {
  enterpriseTransactionDocumentService,
  type DurableDocumentDto,
} from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { enterpriseDocumentPackageService } from "@server/services/enterprise-document-packages/enterprise-document-package.service";
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

function relativePathFromRow(row: DurableDocumentDto): string | null {
  const display = (row.displayName || "").replace(/\\/g, "/").trim();
  if (display.includes("/")) return display;
  return row.originalFilename || null;
}

export function mapDurableDocToPartner(
  row: DurableDocumentDto,
): PartnerOpportunityDocumentDto {
  const fromPartner = row.uploadSource === WEALTH_PARTNER_UPLOAD_SOURCE;
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
    uploadedByLabel: fromPartner
      ? row.uploadedBy || "Wealth Partner"
      : row.uploadedBy || "Catalyst One",
    relativePath: relativePathFromRow(row),
    folderName: fromPartner && row.categoryLabel ? row.categoryLabel : null,
    uploadSource: row.uploadSource ?? null,
    sourceLabel: fromPartner
      ? "Catalyst Connect"
      : documentRegistrySourceLabel(row.uploadSource),
    participantId: row.participantId ?? null,
    documentScope: row.documentScope ?? null,
    updatedAt: row.updatedAt,
    dtoSource: "enterprise_opportunity_registry",
  };
}

function stableFolderClientRecordId(
  opportunityId: string,
  packageId: string,
  relativePath: string,
): string {
  const key = `${opportunityId}|${packageId}|${relativePath.replace(/\\/g, "/").toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (Math.imul(31, hash) + key.charCodeAt(i)) >>> 0;
  }
  const pkg = packageId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "folder";
  return `wp-pkg-${pkg}-${hash.toString(36)}`;
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
  relativePath?: string | null;
  folderName?: string | null;
  packageId?: string | null;
  dealId?: string | null;
  participantId?: string | null;
  documentScope?: "applicant" | "shared" | "lender" | null;
}): Promise<PartnerOpportunityDocumentDto> {
  const relativePath = (input.relativePath || "").replace(/\\/g, "/").trim();
  const packageId = input.packageId?.trim() || "";
  const clientRecordId =
    input.replaceDocumentId?.trim() ||
    (packageId && relativePath
      ? stableFolderClientRecordId(input.opportunityId, packageId, relativePath)
      : `wp-${input.opportunityId}-${input.typeRef}-${randomUUID().replace(/-/g, "").slice(0, 12)}`);

  const raw = input.contentBase64?.trim() || null;
  const contentBase64 =
    raw && raw.includes(",") ? raw.split(",").pop() || null : raw;

  const displayName =
    relativePath || input.title || input.fileName;
  const documentScope =
    input.participantId?.trim()
      ? "applicant"
      : input.documentScope || "shared";

  const row = await enterpriseTransactionDocumentService.upsertForOrganization(
    input.organizationId,
    {
      opportunityId: input.opportunityId,
      opportunityNumber: input.opportunityNumber ?? null,
      clientRecordId,
      loanFileId: input.dealId?.trim() || null,
      contactId: input.contactId ?? null,
      customerId: input.contactId ?? null,
      participantId: input.participantId?.trim() || null,
      documentScope,
      typeRef: input.typeRef,
      categoryLabel: input.folderName?.trim() || input.categoryLabel,
      originalFilename: input.fileName,
      displayName,
      mimeType: input.mimeType || "application/octet-stream",
      fileSizeBytes: Math.max(0, Math.round(input.sizeBytes || 0)),
      status: "active",
      uploadSource: WEALTH_PARTNER_UPLOAD_SOURCE,
      uploadedBy: input.uploadedBy,
      contentBase64,
    },
  );

  if (packageId) {
    await appendPartnerDocumentPackageBestEffort({
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      contactId: input.contactId ?? null,
      clientPackageId: packageId,
      folderName: input.folderName?.trim() || "Document Folder",
      documentId: row.id,
      relativePath: relativePath || input.fileName,
      fileSizeBytes: row.fileSizeBytes,
      uploadedBy: input.uploadedBy,
      participantId: input.participantId?.trim() || null,
      documentScope,
      loanFileId: input.dealId?.trim() || null,
    });
  }

  return mapDurableDocToPartner(row);
}

function isMissingPackageTable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /enterprise_document_packages/i.test(message) ||
    /does not exist/i.test(message) ||
    /P2021/i.test(message)
  );
}

async function appendPartnerDocumentPackageBestEffort(input: {
  organizationId: string;
  opportunityId: string;
  contactId?: string | null;
  clientPackageId: string;
  folderName: string;
  documentId: string;
  relativePath: string;
  fileSizeBytes: number;
  uploadedBy: string;
  participantId?: string | null;
  documentScope?: string | null;
  loanFileId?: string | null;
}): Promise<void> {
  try {
    const current =
      await enterpriseDocumentPackageService.findByClientPackageIdForOrganization(
        input.organizationId,
        input.clientPackageId,
      );
    const documentIds = current?.documentIds?.length
      ? [...current.documentIds]
      : [];
    if (!documentIds.includes(input.documentId)) documentIds.push(input.documentId);
    const relativePaths = { ...(current?.relativePaths || {}) };
    relativePaths[input.documentId] = input.relativePath;
    const alreadyCounted = Boolean(current?.documentIds?.includes(input.documentId));
    const totalSize =
      (current?.totalSizeBytes || 0) + (alreadyCounted ? 0 : input.fileSizeBytes);

    await enterpriseDocumentPackageService.upsertForOrganization(input.organizationId, {
      clientPackageId: input.clientPackageId,
      opportunityId: input.opportunityId,
      loanFileId: input.loanFileId ?? null,
      folderName: input.folderName,
      status: "complete",
      storageStatus: "durable_metadata",
      fileCount: documentIds.length,
      totalSizeBytes: totalSize,
      uploadedBy: input.uploadedBy,
      createdBy: input.uploadedBy,
      participantId: input.participantId ?? null,
      documentScope: input.documentScope ?? "shared",
      contactId: input.contactId ?? null,
      customerId: input.contactId ?? null,
      parentEntityType: "opportunity",
      parentEntityId: input.opportunityId,
      documentIds,
      relativePaths,
    });
  } catch (err) {
    if (isMissingPackageTable(err)) return;
    /* fail-open — files already persist on EnterpriseTransactionDocument */
  }
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
