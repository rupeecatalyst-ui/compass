/**
 * CO-DOC-002 / 014B — List / upsert / delete durable Opportunity documents.
 * Access is resolved server-side. Binaries are never listed as base64 or storage keys.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  enterpriseTransactionDocumentService,
  toPublicDurableDocumentDto,
  type DurableDocumentInput,
} from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { resolveDocumentWorkspaceAccess } from "@server/services/document-workspace/document-workspace-access.service";
import { moveDocumentToDeletedDocuments } from "@server/services/document-workspace/document-workspace-lifecycle.service";
import {
  capabilityAllowed,
  documentWorkspaceHttpError,
  isTokenAuthFailure,
} from "@/lib/document-workspace/access-decision";
import type { Role } from "@/constants/roles";

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
    const opportunityId = url.searchParams.get("opportunityId")?.trim();
    if (!opportunityId) {
      return errorResponse(400, "VALIDATION", "opportunityId is required");
    }
    const authorised = await resolveDocumentWorkspaceAccess({
      userId: actor.userId,
      capability: "view",
      claimedOrganizationId: url.searchParams.get("organizationId"),
      opportunityId,
      dealId: url.searchParams.get("dealId"),
      documentId: url.searchParams.get("documentId"),
    });
    const items = await enterpriseTransactionDocumentService.listByOpportunityForOrganization(
      authorised.organizationId,
      authorised.opportunityId,
      { includeContent: false },
    );
    const scoped = authorised.dealId
      ? items.filter((item) => (item.dealId || "") === authorised.dealId)
      : items;
    return successResponse({ items: scoped.map(toPublicDurableDocumentDto) });
  } catch (err) {
    return wrap(err);
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    const body = (await request.json()) as DurableDocumentInput;
    if (!body.opportunityId?.trim() || !body.clientRecordId?.trim() || !body.typeRef?.trim()) {
      return errorResponse(
        400,
        "VALIDATION",
        "opportunityId, clientRecordId and typeRef are required",
      );
    }
    const deleting = String(body.status || "").toLowerCase() === "deleted";
    const authorised = await resolveDocumentWorkspaceAccess({
      userId: actor.userId,
      capability: deleting ? "delete" : "upload",
      opportunityId: body.opportunityId,
      dealId: body.dealId,
    });
    if (deleting) {
      const reason = String(
        (body as DurableDocumentInput & { reason?: string; deletionReason?: string }).reason ||
          (body as DurableDocumentInput & { deletionReason?: string }).deletionReason ||
          "",
      ).trim();
      if (!reason) {
        return errorResponse(400, "VALIDATION", "A deletion reason is required.");
      }
      const existing = await enterpriseTransactionDocumentService.listByOpportunityForOrganization(
        authorised.organizationId,
        authorised.opportunityId,
        { includeContent: false },
      );
      const targetId =
        existing.find((row) => row.clientRecordId === body.clientRecordId || row.id === body.clientRecordId)
          ?.id || "";
      if (!targetId) {
        return errorResponse(404, "NOT_FOUND", "Resource is not available.");
      }
      await moveDocumentToDeletedDocuments({
        organizationId: authorised.organizationId,
        opportunityId: authorised.opportunityId,
        documentId: targetId,
        actorUserId: authorised.actor.userId,
        actorRole: authorised.actor.role,
        reason,
        companyId: authorised.companyId,
      });
      return successResponse({ ok: true });
    }
    if (body.contentBase64) {
      const existing = await enterpriseTransactionDocumentService.listByOpportunityForOrganization(
        authorised.organizationId,
        authorised.opportunityId,
        { includeContent: false },
      );
      const already = existing.some(
        (row) => row.clientRecordId === body.clientRecordId || row.id === body.clientRecordId,
      );
      if (already && !capabilityAllowed(authorised.actor.role as Role, "replace")) {
        return errorResponse(403, "FORBIDDEN", "You are not allowed to perform this action.");
      }
    }
    const item = await enterpriseTransactionDocumentService.upsertForOrganization(
      authorised.organizationId,
      {
        ...body,
        opportunityId: authorised.opportunityId,
        dealId: authorised.dealId ?? body.dealId ?? null,
        uploadedBy: authorised.actor.email || authorised.actor.userId,
      },
    );
    return successResponse(toPublicDurableDocumentDto(item), 201);
  } catch (err) {
    return wrap(err);
  }
}

export async function DELETE(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    const url = new URL(request.url);
    const opportunityId = url.searchParams.get("opportunityId")?.trim() || "";
    const documentId = url.searchParams.get("documentId")?.trim() || "";
    const clientRecordId = url.searchParams.get("clientRecordId")?.trim() || "";
    if (!opportunityId || (!documentId && !clientRecordId)) {
      return errorResponse(400, "VALIDATION", "opportunityId and documentId are required");
    }
    const reason = url.searchParams.get("reason")?.trim() || "";
    if (!reason) {
      return errorResponse(400, "VALIDATION", "A deletion reason is required.");
    }
    const authorised = await resolveDocumentWorkspaceAccess({
      userId: actor.userId,
      capability: "delete",
      opportunityId,
      dealId: url.searchParams.get("dealId"),
      documentId: documentId || null,
    });
    let targetId = authorised.documentId || documentId;
    if (!targetId && clientRecordId) {
      const items = await enterpriseTransactionDocumentService.listByOpportunityForOrganization(
        authorised.organizationId,
        authorised.opportunityId,
        { includeContent: false },
      );
      targetId = items.find((row) => row.clientRecordId === clientRecordId)?.id || "";
    }
    if (!targetId) {
      return errorResponse(404, "NOT_FOUND", "Resource is not available.");
    }
    await moveDocumentToDeletedDocuments({
      organizationId: authorised.organizationId,
      opportunityId: authorised.opportunityId,
      documentId: targetId,
      actorUserId: authorised.actor.userId,
      actorRole: authorised.actor.role,
      reason,
      companyId: authorised.companyId,
    });
    return successResponse({ ok: true });
  } catch (err) {
    return wrap(err);
  }
}
