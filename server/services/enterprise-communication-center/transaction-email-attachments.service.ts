import { resolveDocumentWorkspaceAccess, assertDocumentsInAuthorisedContext } from "@server/services/document-workspace/document-workspace-access.service";
import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { validateDocumentWorkspaceUpload } from "@/lib/document-workspace/file-security";
import { DOCUMENT_WORKSPACE_ZIP_MAX_BYTES } from "@/constants/document-workspace-refinement-014";
import type { OperationalSmtpAttachment } from "./smtp-transport.service";

/** Resolve registry references through the same authorization and binary path as Document Workspace. */
export async function loadTransactionEmailAttachments(input: {
  actorUserId: string; organizationId: string; opportunityId: string; dealId?: string | null; documentIds: string[];
}): Promise<OperationalSmtpAttachment[]> {
  if (!input.documentIds.length) return [];
  if (input.documentIds.length > 50 || input.documentIds.some(id => typeof id !== "string" || !id.trim())) {
    throw Object.assign(new Error("Invalid document selection"), { statusCode: 422, code: "INVALID_SELECTION" });
  }
  const context = await resolveDocumentWorkspaceAccess({
    userId: input.actorUserId, capability: "share", claimedOrganizationId: input.organizationId,
    opportunityId: input.opportunityId, dealId: input.dealId,
  });
  const documents = await enterpriseTransactionDocumentService.listByOpportunityForOrganization(context.organizationId, context.opportunityId, { includeContent: false });
  const resolved = [...new Set(input.documentIds)].map(id => documents.find(doc => doc.id === id || doc.clientRecordId === id));
  if (resolved.some(doc => !doc)) throw Object.assign(new Error("Document is not available in this transaction"), { statusCode: 404, code: "NOT_FOUND" });
  const selected = [...new Map(resolved.map(doc => [doc!.id, doc!])).values()];
  await assertDocumentsInAuthorisedContext({ context, documentIds: selected.map(doc => doc!.id) });
  const attachments: OperationalSmtpAttachment[] = [];
  let totalBytes = 0;
  for (const doc of selected) {
    const binary = await enterpriseTransactionDocumentService.resolveBinaryForOrganization({
      organizationId: context.organizationId, opportunityId: context.opportunityId, documentId: doc!.id,
    });
    if (!binary.bytes?.byteLength) throw Object.assign(new Error("Document upload is incomplete"), { statusCode: 422, code: "DOCUMENT_CONTENT_UNAVAILABLE" });
    const validation = validateDocumentWorkspaceUpload({ filename: doc!.originalFilename, declaredMime: binary.mimeType, byteLength: binary.bytes.byteLength, bytes: binary.bytes });
    if (!validation.ok) throw Object.assign(new Error(validation.message), { statusCode: 422, code: "INVALID_FILE" });
    totalBytes += binary.bytes.byteLength;
    if (totalBytes > DOCUMENT_WORKSPACE_ZIP_MAX_BYTES) throw Object.assign(new Error("Document pack is too large"), { statusCode: 422, code: "ATTACHMENT_LIMIT" });
    attachments.push({ filename: validation.safeFilename, mimeType: validation.mimeType, bytes: binary.bytes });
  }
  return attachments;
}
