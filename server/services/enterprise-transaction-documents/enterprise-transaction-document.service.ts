/**
 * CO-DOC-002 — Durable Opportunity Document Registry (server).
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

const MAX_CONTENT_BYTES = 4 * 1024 * 1024;

function createId() {
  return randomUUID().replace(/-/g, "");
}

export type DurableDocumentInput = {
  opportunityId: string;
  opportunityNumber?: string | null;
  clientRecordId: string;
  loanFileId?: string | null;
  contactId?: string | null;
  customerId?: string | null;
  participantId?: string | null;
  lenderId?: string | null;
  documentScope?: string | null;
  typeRef: string;
  categoryLabel: string;
  originalFilename: string;
  displayName: string;
  mimeType: string;
  fileSizeBytes: number;
  status?: string;
  uploadSource?: string | null;
  uploadedBy: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  /** base64 content — stored when under MAX_CONTENT_BYTES */
  contentBase64?: string | null;
};

export type DurableDocumentDto = {
  id: string;
  opportunityId: string;
  opportunityNumber?: string | null;
  clientRecordId?: string | null;
  loanFileId?: string | null;
  contactId?: string | null;
  customerId?: string | null;
  participantId?: string | null;
  lenderId?: string | null;
  documentScope: string;
  typeRef: string;
  categoryLabel: string;
  originalFilename: string;
  displayName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  uploadSource?: string | null;
  uploadedBy: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  hasContent: boolean;
  contentBase64?: string | null;
  createdAt: string;
  updatedAt: string;
};

function serialize(
  row: {
    id: string;
    opportunityId: string;
    opportunityNumber: string | null;
    clientRecordId: string | null;
    loanFileId: string | null;
    contactId: string | null;
    customerId: string | null;
    participantId: string | null;
    lenderId: string | null;
    documentScope: string;
    typeRef: string;
    categoryLabel: string;
    originalFilename: string;
    displayName: string;
    mimeType: string;
    fileSizeBytes: number;
    status: string;
    uploadSource: string | null;
    uploadedBy: string;
    verifiedAt: Date | null;
    verifiedBy: string | null;
    contentBytes: Buffer | Uint8Array | null;
    createdAt: Date;
    updatedAt: Date;
  },
  includeContent: boolean,
): DurableDocumentDto {
  const hasContent = Boolean(row.contentBytes && row.contentBytes.length > 0);
  return {
    id: row.id,
    opportunityId: row.opportunityId,
    opportunityNumber: row.opportunityNumber,
    clientRecordId: row.clientRecordId,
    loanFileId: row.loanFileId,
    contactId: row.contactId,
    customerId: row.customerId,
    participantId: row.participantId,
    lenderId: row.lenderId,
    documentScope: row.documentScope,
    typeRef: row.typeRef,
    categoryLabel: row.categoryLabel,
    originalFilename: row.originalFilename,
    displayName: row.displayName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    status: row.status,
    uploadSource: row.uploadSource,
    uploadedBy: row.uploadedBy,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    verifiedBy: row.verifiedBy,
    hasContent,
    contentBase64:
      includeContent && hasContent && row.contentBytes
        ? Buffer.from(row.contentBytes).toString("base64")
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const enterpriseTransactionDocumentService = {
  async upsert(input: DurableDocumentInput): Promise<DurableDocumentDto> {
    const organizationId = await resolvePilotOrganizationId();
    return this.upsertForOrganization(organizationId, input);
  },

  /** CO-WP-INT-002 / multi-org — write against a known organization. */
  async upsertForOrganization(
    organizationId: string,
    input: DurableDocumentInput,
  ): Promise<DurableDocumentDto> {
    let contentBytes: Uint8Array | undefined;
    if (input.contentBase64) {
      const raw = input.contentBase64.includes(",")
        ? input.contentBase64.split(",").pop() || ""
        : input.contentBase64;
      const buf = Buffer.from(raw, "base64");
      if (buf.length > 0 && buf.length <= MAX_CONTENT_BYTES) {
        contentBytes = Uint8Array.from(buf);
      }
    }

    const existing = await prisma.enterpriseTransactionDocument.findFirst({
      where: {
        organizationId,
        OR: [
          { clientRecordId: input.clientRecordId },
          {
            opportunityId: input.opportunityId,
            typeRef: input.typeRef,
            originalFilename: input.originalFilename,
            status: "active",
            ...(input.participantId
              ? { participantId: input.participantId }
              : { participantId: null }),
          },
        ],
      },
    });

    const data = {
      opportunityId: input.opportunityId,
      opportunityNumber: input.opportunityNumber ?? null,
      clientRecordId: input.clientRecordId,
      loanFileId: input.loanFileId ?? null,
      contactId: input.contactId ?? null,
      customerId: input.customerId ?? null,
      participantId: input.participantId ?? null,
      lenderId: input.lenderId ?? null,
      documentScope: input.documentScope || "applicant",
      typeRef: input.typeRef,
      categoryLabel: input.categoryLabel,
      originalFilename: input.originalFilename,
      displayName: input.displayName,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      status: input.status || "active",
      uploadSource: input.uploadSource ?? null,
      uploadedBy: input.uploadedBy,
      verifiedAt: input.verifiedAt ? new Date(input.verifiedAt) : null,
      verifiedBy: input.verifiedBy ?? null,
      ...(contentBytes ? { contentBytes } : {}),
    };

    const row = existing
      ? await prisma.enterpriseTransactionDocument.update({
          where: { id: existing.id },
          data: data as Parameters<
            typeof prisma.enterpriseTransactionDocument.update
          >[0]["data"],
        })
      : await prisma.enterpriseTransactionDocument.create({
          data: {
            id: createId(),
            organizationId,
            ...data,
          } as Parameters<typeof prisma.enterpriseTransactionDocument.create>[0]["data"],
        });

    return serialize(row, false);
  },

  async listByOpportunity(
    opportunityId: string,
    opts?: { includeContent?: boolean },
  ): Promise<DurableDocumentDto[]> {
    const organizationId = await resolvePilotOrganizationId();
    return this.listByOpportunityForOrganization(organizationId, opportunityId, opts);
  },

  async listByOpportunityForOrganization(
    organizationId: string,
    opportunityId: string,
    opts?: { includeContent?: boolean },
  ): Promise<DurableDocumentDto[]> {
    const rows = await prisma.enterpriseTransactionDocument.findMany({
      where: {
        organizationId,
        opportunityId,
        status: { not: "deleted" },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return rows.map((r) => serialize(r, Boolean(opts?.includeContent)));
  },

  /** Soft-delete a document that belongs to the opportunity (ownership checked by caller). */
  async softDeleteForOrganization(input: {
    organizationId: string;
    opportunityId: string;
    documentId: string;
  }): Promise<boolean> {
    const row = await prisma.enterpriseTransactionDocument.findFirst({
      where: {
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
        id: input.documentId,
        status: { not: "deleted" },
      },
      select: { id: true },
    });
    if (!row) return false;
    await prisma.enterpriseTransactionDocument.update({
      where: { id: row.id },
      data: { status: "deleted" },
    });
    return true;
  },
};
