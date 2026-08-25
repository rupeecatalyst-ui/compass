/**
 * CO-CHANAKYA-DOCUMENT-STORAGE-009 — Multipart binary upload for durable object storage.
 * Authenticated · Opportunity-scoped. Does not return permanent public URLs.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { ETD_OBJECT_STORAGE_MAX_BYTES } from "@/constants/enterprise-document-object-storage";
import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

export async function POST(request: Request) {
  try {
    guard();
    requireAccessToken(request);

    const form = await request.formData();
    const opportunityId = String(form.get("opportunityId") || "").trim();
    const clientRecordId = String(form.get("clientRecordId") || "").trim();
    const documentId = String(form.get("documentId") || "").trim();
    const file = form.get("file");

    if (!opportunityId || (!clientRecordId && !documentId)) {
      return errorResponse(
        400,
        "VALIDATION",
        "opportunityId and clientRecordId (or documentId) are required",
      );
    }
    if (!(file instanceof Blob)) {
      return errorResponse(400, "VALIDATION", "file is required");
    }
    if (file.size <= 0 || file.size > ETD_OBJECT_STORAGE_MAX_BYTES) {
      return errorResponse(
        413,
        "OBJECT_TOO_LARGE",
        `file must be between 1 and ${ETD_OBJECT_STORAGE_MAX_BYTES} bytes`,
      );
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    const organizationId = await resolvePilotOrganizationId();
    const item = await enterpriseTransactionDocumentService.putBinaryForOrganization({
      organizationId,
      opportunityId,
      clientRecordId: clientRecordId || null,
      documentId: documentId || null,
      mimeType: file.type || null,
      bytes: buf,
    });

    return successResponse({
      id: item.id,
      opportunityId: item.opportunityId,
      hasContent: item.hasContent,
      storageKey: item.storageKey ?? null,
      storageProvider: item.storageProvider ?? null,
      contentHash: item.contentHash ?? null,
      contentVersion: item.contentVersion,
      fileSizeBytes: item.fileSizeBytes,
    });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "TRANSACTION_DOCUMENT_BINARY_ERROR",
      e.message || "Failed to store document binary",
    );
  }
}
