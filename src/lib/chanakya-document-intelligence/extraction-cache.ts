/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-006 — In-process extraction cache (idempotency).
 * Keyed by opportunityId + documentId + content hash. No durable parallel SSOT.
 */

import { createHash } from "node:crypto";
import type { ChanakyaDocumentExtractedFact } from "@/types/chanakya-document-intelligence";

type CacheEntry = {
  contentHash: string;
  textExcerpt: string | null;
  facts: ChanakyaDocumentExtractedFact[];
  cachedAt: string;
};

const cache = new Map<string, CacheEntry>();

export function hashDocumentBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex").slice(0, 24);
}

function key(opportunityId: string, documentId: string): string {
  return `${opportunityId}::${documentId}`;
}

export function getCachedDocumentExtraction(input: {
  opportunityId: string;
  documentId: string;
  contentHash: string;
}): CacheEntry | null {
  const hit = cache.get(key(input.opportunityId, input.documentId));
  if (!hit) return null;
  if (hit.contentHash !== input.contentHash) return null;
  return hit;
}

export function setCachedDocumentExtraction(input: {
  opportunityId: string;
  documentId: string;
  contentHash: string;
  textExcerpt: string | null;
  facts: ChanakyaDocumentExtractedFact[];
}): void {
  cache.set(key(input.opportunityId, input.documentId), {
    contentHash: input.contentHash,
    textExcerpt: input.textExcerpt,
    facts: input.facts,
    cachedAt: new Date().toISOString(),
  });
}

/** Test helper — clear cache between verify runs. */
export function clearDocumentExtractionCache(): void {
  cache.clear();
}
