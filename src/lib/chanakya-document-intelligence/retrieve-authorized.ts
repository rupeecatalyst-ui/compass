/**
 * CO-CHANAKYA-CREDIT-INTELLIGENCE-005 / 008 / 009 — Authorized Opportunity document retrieval.
 * Server-only. No arbitrary storage URLs. No cross-opportunity access.
 * Resolves inline contentBytes or durable object-store binaries (storageKey).
 */

import "server-only";

import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import type { DurableDocumentDto } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES,
  CHANAKYA_DOC_READ_MAX_BYTES,
} from "@/constants/chanakya-document-intelligence";
import { ETD_INLINE_CONTENT_BYTES_MAX } from "@/constants/enterprise-document-object-storage";

export type BinaryAbsentReason =
  | "none"
  | "never_persisted"
  | "over_durable_cap"
  | "decode_failed"
  | "object_store_miss";

export interface AuthorizedDocumentBinary {
  documentId: string;
  opportunityId: string;
  displayName: string;
  typeRef: string;
  mimeType: string;
  status: string;
  verified: boolean;
  hasContent: boolean;
  byteLength: number;
  /** Declared upload size from metadata (may exceed inline cap). */
  fileSizeBytes: number;
  storageKey: string | null;
  storageProvider: string | null;
  contentHash: string | null;
  contentVersion: number;
  binarySource: "inline" | "object_store" | "none";
  /** Why content bytes are missing when metadata exists. */
  binaryAbsentReason: BinaryAbsentReason;
  /** Present only when binary retrieved for THIS opportunityId. */
  bytes: Uint8Array | null;
  updatedAt: string;
}

function decodeContentBase64(contentBase64: string | null | undefined): Uint8Array | null {
  if (!contentBase64) return null;
  const raw = contentBase64.includes(",")
    ? contentBase64.split(",").pop() || ""
    : contentBase64;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length === 0 || buf.length > CHANAKYA_DOC_READ_MAX_BYTES) return null;
  return Uint8Array.from(buf);
}

function resolveBinaryAbsentReason(
  row: DurableDocumentDto,
  bytes: Uint8Array | null,
  source: "inline" | "object_store" | "none",
): BinaryAbsentReason {
  if (bytes && bytes.byteLength > 0) return "none";
  if (row.storageKey && source === "none") return "object_store_miss";
  if (row.hasContent) return "decode_failed";
  if (
    row.fileSizeBytes > ETD_INLINE_CONTENT_BYTES_MAX &&
    !row.storageKey
  ) {
    return "over_durable_cap";
  }
  if (row.fileSizeBytes > CHANAKYA_DOC_DURABLE_BINARY_MAX_BYTES && !row.storageKey) {
    return "over_durable_cap";
  }
  if (row.fileSizeBytes > 0) return "never_persisted";
  return "never_persisted";
}

/**
 * Retrieve durable documents for a single Opportunity only.
 * Rejects any row whose opportunityId does not match (defense in depth).
 */
export async function retrieveAuthorizedOpportunityDocuments(input: {
  opportunityId: string;
  includeBinary?: boolean;
}): Promise<AuthorizedDocumentBinary[]> {
  const opportunityId = String(input.opportunityId || "").trim();
  if (!opportunityId) {
    throw Object.assign(new Error("opportunityId is required"), {
      code: "OPPORTUNITY_REQUIRED",
      status: 400,
    });
  }

  const includeBinary = input.includeBinary !== false;
  let rows: DurableDocumentDto[] = [];
  let organizationId = "";
  try {
    organizationId = await resolvePilotOrganizationId();
    rows = await enterpriseTransactionDocumentService.listByOpportunity(opportunityId, {
      includeContent: includeBinary,
    });
  } catch {
    rows = [];
  }

  const out: AuthorizedDocumentBinary[] = [];
  for (const row of rows) {
    if (row.opportunityId !== opportunityId) {
      continue;
    }

    let bytes: Uint8Array | null = null;
    let binarySource: "inline" | "object_store" | "none" = "none";
    let mimeType = row.mimeType || "application/octet-stream";

    if (includeBinary) {
      bytes = decodeContentBase64(row.contentBase64);
      if (bytes?.byteLength) {
        binarySource = "inline";
      } else if (organizationId && (row.storageKey || row.hasContent)) {
        try {
          const resolved =
            await enterpriseTransactionDocumentService.resolveBinaryForOrganization({
              organizationId,
              opportunityId,
              documentId: row.id,
            });
          if (resolved.bytes?.byteLength) {
            if (resolved.bytes.byteLength > CHANAKYA_DOC_READ_MAX_BYTES) {
              bytes = null;
              binarySource = "none";
            } else {
              bytes = resolved.bytes;
              binarySource = resolved.source === "none" ? "none" : resolved.source;
              mimeType = resolved.mimeType || mimeType;
            }
          }
        } catch {
          bytes = null;
          binarySource = "none";
        }
      }
    }

    out.push({
      documentId: row.id,
      opportunityId: row.opportunityId,
      displayName: row.displayName || row.originalFilename || row.typeRef,
      typeRef: row.typeRef,
      mimeType,
      status: row.status,
      verified: Boolean(row.verifiedAt),
      hasContent: Boolean(row.hasContent),
      byteLength: bytes?.byteLength ?? 0,
      fileSizeBytes: row.fileSizeBytes || 0,
      storageKey: row.storageKey ?? null,
      storageProvider: row.storageProvider ?? null,
      contentHash: row.contentHash ?? null,
      contentVersion: row.contentVersion ?? 1,
      binarySource,
      binaryAbsentReason: resolveBinaryAbsentReason(row, bytes, binarySource),
      bytes,
      updatedAt: row.updatedAt,
    });
  }
  return out;
}
