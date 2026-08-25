/**
 * CO-DOC-002 / CO-CHANAKYA-DOCUMENT-STORAGE-009 — Durable Opportunity Document Registry.
 * Small files: optional inline contentBytes (≤4MB).
 * Large files: object store via storageKey (postgres blob or Supabase Storage).
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@server/lib/prisma";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  ETD_INLINE_CONTENT_BYTES_MAX,
  ETD_OBJECT_STORAGE_MAX_BYTES,
} from "@/constants/enterprise-document-object-storage";
import {
  hashDocumentObjectBytes,
  resolveDocumentObjectStorage,
} from "@/lib/enterprise-document-object-storage";

const MAX_CONTENT_BYTES = ETD_INLINE_CONTENT_BYTES_MAX;

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
  /** base64 content — inlined when under MAX_CONTENT_BYTES; larger → object store */
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
  storageKey?: string | null;
  storageProvider?: string | null;
  contentHash?: string | null;
  contentVersion: number;
  contentBase64?: string | null;
  createdAt: string;
  updatedAt: string;
};

type EtdRow = {
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
  storageKey: string | null;
  storageProvider: string | null;
  contentHash: string | null;
  contentVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

function decodeBase64ToBytes(contentBase64: string): Uint8Array | null {
  const raw = contentBase64.includes(",")
    ? contentBase64.split(",").pop() || ""
    : contentBase64;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length === 0) return null;
  return Uint8Array.from(buf);
}

function serialize(row: EtdRow, includeContent: boolean): DurableDocumentDto {
  const hasInline = Boolean(row.contentBytes && row.contentBytes.length > 0);
  const hasObject = Boolean(row.storageKey);
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
    hasContent: hasInline || hasObject,
    storageKey: row.storageKey,
    storageProvider: row.storageProvider,
    contentHash: row.contentHash,
    contentVersion: row.contentVersion ?? 1,
    contentBase64:
      includeContent && hasInline && row.contentBytes
        ? Buffer.from(row.contentBytes).toString("base64")
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function nextContentVersion(row: {
  contentVersion?: number | null;
  contentBytes?: Buffer | Uint8Array | null;
  storageKey?: string | null;
} | null): number {
  if (!row) return 1;
  const hasPriorBinary = Boolean(
    (row.contentBytes && row.contentBytes.length > 0) || row.storageKey,
  );
  const current = Math.max(1, row.contentVersion || 1);
  return hasPriorBinary ? current + 1 : current;
}

async function persistBinaryForDocument(input: {
  organizationId: string;
  documentId: string;
  opportunityId: string;
  mimeType: string;
  bytes: Uint8Array;
  contentVersion: number;
}): Promise<{
  contentBytes?: Uint8Array;
  storageKey?: string;
  storageProvider?: string;
  contentHash: string;
  contentVersion: number;
  clearInline?: boolean;
}> {
  const contentHash = hashDocumentObjectBytes(input.bytes);
  const contentVersion = Math.max(1, input.contentVersion);

  if (input.bytes.byteLength <= MAX_CONTENT_BYTES) {
    return {
      contentBytes: input.bytes,
      contentHash,
      contentVersion,
      clearInline: false,
    };
  }

  if (input.bytes.byteLength > ETD_OBJECT_STORAGE_MAX_BYTES) {
    throw Object.assign(
      new Error(
        `Document exceeds durable object-storage max (${ETD_OBJECT_STORAGE_MAX_BYTES} bytes)`,
      ),
      { code: "OBJECT_TOO_LARGE", statusCode: 413 },
    );
  }

  const store = resolveDocumentObjectStorage();
  if (!store.isAvailable()) {
    throw Object.assign(new Error("Durable object storage is unavailable"), {
      code: "STORAGE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  const put = await store.put({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    documentId: input.documentId,
    version: contentVersion,
    contentHash,
    mimeType: input.mimeType,
    bytes: input.bytes,
  });

  return {
    storageKey: put.storageKey,
    storageProvider: put.storageProvider,
    contentHash,
    contentVersion,
    clearInline: true,
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
    let incomingBytes: Uint8Array | null = null;
    if (input.contentBase64) {
      incomingBytes = decodeBase64ToBytes(input.contentBase64);
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

    const documentId = existing?.id ?? createId();

    let binaryFields: {
      contentBytes?: Uint8Array | null;
      storageKey?: string | null;
      storageProvider?: string | null;
      contentHash?: string | null;
      contentVersion?: number;
    } = {};

    if (incomingBytes && incomingBytes.byteLength > 0) {
      const persisted = await persistBinaryForDocument({
        organizationId,
        documentId,
        opportunityId: input.opportunityId,
        mimeType: input.mimeType,
        bytes: incomingBytes,
        contentVersion: nextContentVersion(existing),
      });
      binaryFields = {
        contentHash: persisted.contentHash,
        contentVersion: persisted.contentVersion,
        ...(persisted.clearInline
          ? {
              contentBytes: null,
              storageKey: persisted.storageKey ?? null,
              storageProvider: persisted.storageProvider ?? null,
            }
          : {
              contentBytes: persisted.contentBytes,
            }),
      };
    }

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
      ...binaryFields,
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
            id: documentId,
            organizationId,
            ...data,
          } as Parameters<typeof prisma.enterpriseTransactionDocument.create>[0]["data"],
        });

    return serialize(row as EtdRow, false);
  },

  /**
   * Attach / replace durable binary for an existing Opportunity document.
   * Used by multipart large-file upload (avoids giant JSON base64 bodies).
   */
  async putBinaryForOrganization(input: {
    organizationId: string;
    opportunityId: string;
    clientRecordId?: string | null;
    documentId?: string | null;
    mimeType?: string | null;
    bytes: Uint8Array;
  }): Promise<DurableDocumentDto> {
    const row = await prisma.enterpriseTransactionDocument.findFirst({
      where: {
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
        status: { not: "deleted" },
        ...(input.documentId
          ? { id: input.documentId }
          : input.clientRecordId
            ? { clientRecordId: input.clientRecordId }
            : { id: "__missing__" }),
      },
    });
    if (!row) {
      throw Object.assign(new Error("Document not found for opportunity"), {
        code: "DOCUMENT_NOT_FOUND",
        statusCode: 404,
      });
    }

    const persisted = await persistBinaryForDocument({
      organizationId: input.organizationId,
      documentId: row.id,
      opportunityId: input.opportunityId,
      mimeType: input.mimeType || row.mimeType,
      bytes: input.bytes,
      contentVersion: nextContentVersion(row),
    });

    const updated = await prisma.enterpriseTransactionDocument.update({
      where: { id: row.id },
      data: {
        fileSizeBytes: input.bytes.byteLength,
        mimeType: input.mimeType || row.mimeType,
        contentHash: persisted.contentHash,
        contentVersion: persisted.contentVersion,
        ...(persisted.clearInline
          ? {
              contentBytes: null,
              storageKey: persisted.storageKey ?? null,
              storageProvider: persisted.storageProvider ?? null,
            }
          : {
              contentBytes: persisted.contentBytes
                ? Buffer.from(persisted.contentBytes)
                : undefined,
            }),
      },
    });

    return serialize(updated as EtdRow, false);
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
    return rows.map((r) => serialize(r as EtdRow, Boolean(opts?.includeContent)));
  },

  /**
   * Resolve durable bytes for one authorized Opportunity document.
   * Inline contentBytes first; else object store via storageKey.
   */
  async resolveBinaryForOrganization(input: {
    organizationId: string;
    opportunityId: string;
    documentId: string;
  }): Promise<{
    bytes: Uint8Array | null;
    mimeType: string;
    contentHash: string | null;
    contentVersion: number;
    source: "inline" | "object_store" | "none";
  }> {
    const row = await prisma.enterpriseTransactionDocument.findFirst({
      where: {
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
        id: input.documentId,
        status: { not: "deleted" },
      },
    });
    if (!row) {
      return {
        bytes: null,
        mimeType: "application/octet-stream",
        contentHash: null,
        contentVersion: 1,
        source: "none",
      };
    }

    if (row.contentBytes && row.contentBytes.length > 0) {
      return {
        bytes: Uint8Array.from(row.contentBytes),
        mimeType: row.mimeType,
        contentHash: row.contentHash,
        contentVersion: row.contentVersion ?? 1,
        source: "inline",
      };
    }

    if (row.storageKey) {
      const store = resolveDocumentObjectStorage();
      const obj = await store.get({
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
        storageKey: row.storageKey,
      });
      if (obj?.bytes?.byteLength) {
        return {
          bytes: obj.bytes,
          mimeType: obj.mimeType || row.mimeType,
          contentHash: obj.contentHash || row.contentHash,
          contentVersion: row.contentVersion ?? 1,
          source: "object_store",
        };
      }
    }

    return {
      bytes: null,
      mimeType: row.mimeType,
      contentHash: row.contentHash,
      contentVersion: row.contentVersion ?? 1,
      source: "none",
    };
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
