/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014C
 * Authorised binary fetch for preview/download. Bytes are never written to durable browser storage.
 */

import { getAccessToken } from "@/lib/api-client";
import {
  revokeDocumentObjectUrl,
  trackDocumentObjectUrl,
} from "@/lib/document-registry/blob-store";

export function buildAuthorisedDocumentBinaryUrl(input: {
  documentId: string;
  opportunityId: string;
  dealId?: string | null;
  disposition?: "inline" | "attachment";
}): string {
  const params = new URLSearchParams({
    documentId: input.documentId,
    opportunityId: input.opportunityId,
  });
  if (input.dealId?.trim()) params.set("dealId", input.dealId.trim());
  if (input.disposition === "attachment") params.set("disposition", "attachment");
  return `/api/enterprise-transaction-documents/binary?${params.toString()}`;
}

export async function fetchAuthorisedDocumentObjectUrl(input: {
  documentId: string;
  opportunityId: string;
  dealId?: string | null;
  mimeType?: string | null;
  disposition?: "inline" | "attachment";
}): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;
  const documentId = input.documentId.trim();
  const opportunityId = input.opportunityId.trim();
  if (!documentId || !opportunityId) return null;
  const res = await fetch(buildAuthorisedDocumentBinaryUrl(input), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) return null;
  const blob = new Blob([bytes], {
    type: input.mimeType || res.headers.get("Content-Type") || "application/octet-stream",
  });
  return trackDocumentObjectUrl(URL.createObjectURL(blob));
}

export { revokeDocumentObjectUrl };
