import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
  withOpsRoute,
} from "@/lib/api/auth-route-utils";
import { recordBusinessAudit } from "@/lib/ops";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { assertDocumentStatus } from "@server/services/enterprise-deal/deal-validation";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string }> };

/** GET — list document links · POST — Attach Document */
export async function GET(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    {
      module: "Document",
      action: "list",
      endpoint: `/api/enterprise-deals/${dealId}/documents`,
    },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        requireAccessToken(request);
        const items = await enterpriseDealService.listDocuments(dealId);
        return successResponse({ items }, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}/documents`,
          });
        }
        return errorResponse(
          mapped.status,
          "DEAL_DOCUMENT_LIST_FAILED",
          mapped.body.error?.message ?? "List failed",
          undefined,
          {
            correlationId,
            module: "Document",
            action: "list",
            endpoint: `/api/enterprise-deals/${dealId}/documents`,
          },
        );
      }
    },
  );
}

export async function POST(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    {
      module: "Document",
      action: "upload",
      endpoint: `/api/enterprise-deals/${dealId}/documents`,
    },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        const body = await request.json();
        const row = await enterpriseDealService.attachDocument(dealId, {
          documentDefinitionId: body.documentDefinitionId,
          documentTypeId: body.documentTypeId,
          participantId: body.participantId,
          status: body.status ? assertDocumentStatus(body.status) : undefined,
          storageKey: body.storageKey,
          extension: body.extension,
          actorUserId: actor.userId,
        });
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Document",
          action: "Document Uploaded",
          entityId: dealId,
          previousValue: null,
          newValue:
            typeof body.documentDefinitionId === "string"
              ? body.documentDefinitionId
              : "attached",
          result: "Success",
          correlationId,
        });
        return successResponse(row, 201, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}/documents`,
          });
        }
        return errorResponse(
          mapped.status,
          mapped.body.error?.code ?? "DEAL_DOCUMENT_ATTACH_FAILED",
          mapped.body.error?.message ?? "Attach failed",
          undefined,
          {
            correlationId,
            module: "Document",
            action: "upload",
            endpoint: `/api/enterprise-deals/${dealId}/documents`,
          },
        );
      }
    },
  );
}
