/**
 * In-process object store for BAT / unit proof when Postgres credentials are unavailable.
 * Never used as production SSOT.
 */
import {
  ETD_OBJECT_STORAGE_MAX_BYTES,
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

const memory = new Map<
  string,
  { bytes: Uint8Array; mimeType: string; contentHash: string; organizationId: string; opportunityId: string }
>();

export const memoryDocumentObjectStorage: DocumentObjectStoragePort = {
  providerId: "memory_bat",

  isAvailable() {
    return true;
  },

  async put(input: DocumentObjectPutInput): Promise<DocumentObjectPutResult> {
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > ETD_OBJECT_STORAGE_MAX_BYTES) {
      throw new Error("Invalid object size for memory store");
    }
    const storageKey = buildDocumentObjectStorageKey({
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      documentId: input.documentId,
      version: input.version,
      contentHash: input.contentHash,
    });
    memory.set(storageKey, {
      bytes: Uint8Array.from(input.bytes),
      mimeType: input.mimeType,
      contentHash: input.contentHash,
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
    });
    return {
      storageKey,
      storageProvider: "memory_bat",
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
    const row = memory.get(input.storageKey);
    if (!row) return null;
    if (
      row.organizationId !== input.organizationId ||
      row.opportunityId !== input.opportunityId
    ) {
      return null;
    }
    return {
      bytes: Uint8Array.from(row.bytes),
      mimeType: row.mimeType,
      byteLength: row.bytes.byteLength,
      contentHash: row.contentHash,
    };
  },
};

/** Test helper — clear BAT memory store. */
export function clearMemoryDocumentObjectStorage(): void {
  memory.clear();
}
