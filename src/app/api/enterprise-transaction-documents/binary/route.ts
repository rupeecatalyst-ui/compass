/**
 * CO-CHANAKYA-DOCUMENT-STORAGE-009 / 014B — Authorised binary upload and download.
 * Authenticated · Opportunity-scoped. Does not return permanent public URLs or storage keys.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { resolveDocumentWorkspaceAccess } from "@server/services/document-workspace/document-workspace-access.service";
import { appendDocumentWorkspaceAuditBestEffort } from "@server/services/document-workspace/document-workspace-audit.service";
import {
  DOCUMENT_WORKSPACE_AUDIT_ACTIONS,
  DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
} from "@/constants/document-workspace-audit";
import {
  documentWorkspaceDownloadHeaders,
  shouldInlinePreview,
  validateDocumentWorkspaceUpload,
} from "@/lib/document-workspace/file-security";
import {
  documentWorkspaceHttpError,
  isTokenAuthFailure,
} from "@/lib/document-workspace/access-decision";
import { NextResponse } from "next/server";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

function wrap(err: unknown) {
  if (isTokenAuthFailure(err)) return fromAuthError(err);
  const mapped = documentWorkspaceHttpError(err);
  return errorResponse(mapped.status, mapped.code, mapped.message);
}

export async function GET(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const opportunityId = url.searchParams.get("opportunityId")?.trim() || "";
    const documentId = url.searchParams.get("documentId")?.trim() || "";
    if (!documentId) {
      return errorResponse(400, "VALIDATION", "documentId is required");
    }
    const authorised = await resolveDocumentWorkspaceAccess({
      userId: actor.userId,
      capability: "download",
      opportunityId: opportunityId || null,
      dealId: url.searchParams.get("dealId"),
      documentId,
    });
    const resolved = await enterpriseTransactionDocumentService.resolveBinaryForOrganization({
      organizationId: authorised.organizationId,
      opportunityId: authorised.opportunityId,
      documentId: authorised.documentId || documentId,
    });
    if (!resolved.bytes || resolved.bytes.byteLength === 0) {
      return errorResponse(404, "NOT_FOUND", "Resource is not available.");
    }
    const items = await enterpriseTransactionDocumentService.listByOpportunityForOrganization(
      authorised.organizationId,
      authorised.opportunityId,
      { includeContent: false },
    );
    const meta = items.find((row) => row.id === (authorised.documentId || documentId));
    const filename = meta?.originalFilename || "document";
    const inlineRequested = url.searchParams.get("disposition") !== "attachment";
    const inline =
      inlineRequested &&
      shouldInlinePreview({ mimeType: resolved.mimeType, filename });
    const headers = documentWorkspaceDownloadHeaders({
      mimeType: resolved.mimeType,
      filename,
      inline,
    });
    await appendDocumentWorkspaceAuditBestEffort({
      organizationId: authorised.organizationId,
      actorType: DOCUMENT_WORKSPACE_AUDIT_ACTOR_EMPLOYEE,
      actorId: authorised.actor.userId,
      action: inline
        ? DOCUMENT_WORKSPACE_AUDIT_ACTIONS.DOCUMENT_PREVIEWED
        : DOCUMENT_WORKSPACE_AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
      documentId: authorised.documentId || documentId,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      sourceChannel: "document_workspace",
    });
    return new NextResponse(Buffer.from(resolved.bytes), { status: 200, headers });
  } catch (err) {
    return wrap(err);
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);

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
    const filename =
      file instanceof File && file.name && file.name !== "document.bin"
        ? file.name
        : "";
    const buf = new Uint8Array(await file.arrayBuffer());
    let mimeType = file.type || null;
    if (filename) {
      const validation = validateDocumentWorkspaceUpload({
        filename,
        declaredMime: file.type || null,
        byteLength: buf.byteLength,
        bytes: buf,
      });
      if (!validation.ok) {
        return errorResponse(422, "INVALID_FILE", validation.message);
      }
      mimeType = validation.mimeType;
    } else if (buf.byteLength <= 0) {
      return errorResponse(422, "INVALID_FILE", "The file is empty.");
    }

    const authorised = await resolveDocumentWorkspaceAccess({
      userId: actor.userId,
      capability: documentId ? "replace" : "upload",
      opportunityId,
      dealId: String(form.get("dealId") || "").trim() || null,
      documentId: documentId || null,
    });

    const item = await enterpriseTransactionDocumentService.putBinaryForOrganization({
      organizationId: authorised.organizationId,
      opportunityId: authorised.opportunityId,
      clientRecordId: clientRecordId || null,
      documentId: authorised.documentId || documentId || null,
      mimeType,
      bytes: buf,
    });

    return successResponse({
      id: item.id,
      opportunityId: item.opportunityId,
      hasContent: item.hasContent,
      contentVersion: item.contentVersion,
      fileSizeBytes: item.fileSizeBytes,
    });
  } catch (err) {
    return wrap(err);
  }
}
