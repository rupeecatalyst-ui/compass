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
import {
  assertLifecycleStatus,
  assertOperationalStatus,
  assertRowVersion,
} from "@server/services/enterprise-deal/deal-validation";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string }> };

/** POST — Transition Deal stage / lifecycle */
export async function POST(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    {
      module: "Workflow",
      action: "status_change",
      endpoint: `/api/enterprise-deals/${dealId}/transitions`,
    },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        const body = await request.json();
        const toGrossStage = String(body.toGrossStage ?? "");
        const updated = await enterpriseDealService.transitionDeal(dealId, {
          rowVersion: assertRowVersion(body.rowVersion),
          actorUserId: actor.userId,
          toGrossStage,
          toSubStage: body.toSubStage,
          toLifecycleStatus: body.toLifecycleStatus
            ? assertLifecycleStatus(body.toLifecycleStatus)
            : undefined,
          toOperationalStatus: body.toOperationalStatus
            ? assertOperationalStatus(body.toOperationalStatus)
            : undefined,
          reason: body.reason ? String(body.reason) : null,
        });
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Workflow",
          action: "Status Changed",
          entityId: dealId,
          previousValue: null,
          newValue: toGrossStage || "transitioned",
          result: "Success",
          correlationId,
        });
        return successResponse(updated, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (
          mapped.status === 401 ||
          mapped.status === 404 ||
          mapped.status === 409 ||
          mapped.status === 503
        ) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}/transitions`,
          });
        }
        return errorResponse(
          mapped.status,
          mapped.body.error?.code ?? "DEAL_TRANSITION_FAILED",
          mapped.body.error?.message ?? "Transition failed",
          undefined,
          {
            correlationId,
            module: "Workflow",
            action: "status_change",
            endpoint: `/api/enterprise-deals/${dealId}/transitions`,
          },
        );
      }
    },
  );
}
