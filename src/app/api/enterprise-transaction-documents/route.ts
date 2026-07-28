/**
 * CO-DOC-002 — List / upsert durable Opportunity documents.
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
  type DurableDocumentInput,
} from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const opportunityId = url.searchParams.get("opportunityId")?.trim();
    if (!opportunityId) {
      return errorResponse(400, "VALIDATION", "opportunityId is required");
    }
    const includeContent = url.searchParams.get("includeContent") === "1";
    const items = await enterpriseTransactionDocumentService.listByOpportunity(
      opportunityId,
      { includeContent },
    );
    return successResponse({ items });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "TRANSACTION_DOCUMENT_ERROR",
      e.message || "Failed to list documents",
    );
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
    const item = await enterpriseTransactionDocumentService.upsert({
      ...body,
      uploadedBy: body.uploadedBy || actor.email || actor.userId,
    });
    return successResponse(item, 201);
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "TRANSACTION_DOCUMENT_ERROR",
      e.message || "Failed to upsert document",
    );
  }
}
