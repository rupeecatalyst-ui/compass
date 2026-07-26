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
import { assertCounterpartyType } from "@server/services/enterprise-deal/deal-validation";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string }> };

/** GET — list counterparties · POST — Assign Counterparty */
export async function GET(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    {
      module: "Deal",
      action: "list_counterparties",
      endpoint: `/api/enterprise-deals/${dealId}/counterparties`,
    },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        requireAccessToken(request);
        const items = await enterpriseDealService.listCounterparties(dealId);
        return successResponse({ items }, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}/counterparties`,
          });
        }
        return errorResponse(
          mapped.status,
          "DEAL_COUNTERPARTY_LIST_FAILED",
          mapped.body.error?.message ?? "List failed",
          undefined,
          {
            correlationId,
            module: "Deal",
            action: "list_counterparties",
            endpoint: `/api/enterprise-deals/${dealId}/counterparties`,
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
      module: "Deal",
      action: "assign_lender",
      endpoint: `/api/enterprise-deals/${dealId}/counterparties`,
    },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        const body = await request.json();
        const registryId = String(body.counterpartyRegistryId ?? "");
        const row = await enterpriseDealService.assignCounterparty(dealId, {
          counterpartyType: assertCounterpartyType(body.counterpartyType),
          counterpartyRegistryId: registryId,
          programId: body.programId,
          isPrimary: Boolean(body.isPrimary),
          pipelineStage: body.pipelineStage,
          pipelineSubStage: body.pipelineSubStage,
          applicationRef: body.applicationRef,
          extension: body.extension,
          actorUserId: actor.userId,
        });
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Deal",
          action: "Lender Assigned",
          entityId: dealId,
          previousValue: null,
          newValue: registryId ? `lender:${registryId}` : "assigned",
          result: "Success",
          correlationId,
        });
        return successResponse(row, 201, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}/counterparties`,
          });
        }
        return errorResponse(
          mapped.status,
          mapped.body.error?.code ?? "DEAL_COUNTERPARTY_ASSIGN_FAILED",
          mapped.body.error?.message ?? "Assign failed",
          undefined,
          {
            correlationId,
            module: "Deal",
            action: "assign_lender",
            endpoint: `/api/enterprise-deals/${dealId}/counterparties`,
          },
        );
      }
    },
  );
}
