/**
 * Hostinger-compatible durable object store: dedicated blob table (not ETD.contentBytes).
 * Metadata remains on EnterpriseTransactionDocument; binaries referenced by storageKey.
 */
import "server-only";

import { prisma } from "@server/lib/prisma";
import {
  ETD_OBJECT_STORAGE_MAX_BYTES,
  ETD_STORAGE_PROVIDER_POSTGRES_BLOB,
} from "@/constants/enterprise-document-object-storage";
import {
  assertStorageKeyMatchesOpportunity,
  buildDocumentObjectStorageKey,
} from "./build-storage-key";
import type {
  DocumentObjectGetResult,
  DocumentObjectPutInput,
  DocumentObjectPutResult,
  DocumentObjectStoragePort,
} from "./ports";

export const postgresDocumentObjectStorage: DocumentObjectStoragePort = {
  providerId: ETD_STORAGE_PROVIDER_POSTGRES_BLOB,

  isAvailable() {
    return Boolean(process.env.DATABASE_URL?.trim());
  },

  async put(input: DocumentObjectPutInput): Promise<DocumentObjectPutResult> {
    if (input.bytes.byteLength === 0) {
      throw Object.assign(new Error("Empty document binary"), {
        code: "EMPTY_BINARY",
        status: 400,
      });
    }
    if (input.bytes.byteLength > ETD_OBJECT_STORAGE_MAX_BYTES) {
      throw Object.assign(
        new Error(
          `Document exceeds object-storage max (${ETD_OBJECT_STORAGE_MAX_BYTES} bytes)`,
        ),
        { code: "OBJECT_TOO_LARGE", status: 413 },
      );
    }

    const storageKey = buildDocumentObjectStorageKey({
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      documentId: input.documentId,
      version: input.version,
      contentHash: input.contentHash,
    });

    await prisma.enterpriseDocumentObjectBlob.upsert({
      where: { storageKey },
      create: {
        storageKey,
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
        documentId: input.documentId,
        contentVersion: input.version,
        contentHash: input.contentHash,
        mimeType: input.mimeType || "application/octet-stream",
        byteLength: input.bytes.byteLength,
        contentBytes: Buffer.from(input.bytes),
      },
      update: {
        contentBytes: Buffer.from(input.bytes),
        byteLength: input.bytes.byteLength,
        mimeType: input.mimeType || "application/octet-stream",
        contentHash: input.contentHash,
        contentVersion: input.version,
        documentId: input.documentId,
      },
    });

    return {
      storageKey,
      storageProvider: ETD_STORAGE_PROVIDER_POSTGRES_BLOB,
      byteLength: input.bytes.byteLength,
      contentHash: input.contentHash,
    };
  },

  async get(input: {
    organizationId: string;
    opportunityId: string;
    storageKey: string;
  }): Promise<DocumentObjectGetResult | null> {
    if (
      !assertStorageKeyMatchesOpportunity(
        input.storageKey,
        input.organizationId,
        input.opportunityId,
      )
    ) {
      return null;
    }

    const row = await prisma.enterpriseDocumentObjectBlob.findFirst({
      where: {
        storageKey: input.storageKey,
        organizationId: input.organizationId,
        opportunityId: input.opportunityId,
      },
    });
    if (!row?.contentBytes || row.contentBytes.length === 0) return null;

    return {
      bytes: Uint8Array.from(row.contentBytes),
      mimeType: row.mimeType || "application/octet-stream",
      byteLength: row.contentBytes.length,
      contentHash: row.contentHash,
    };
  },
};
