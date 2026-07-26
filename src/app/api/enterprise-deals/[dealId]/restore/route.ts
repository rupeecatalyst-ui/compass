import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
  withOpsRoute,
} from "@/lib/api/auth-route-utils";
import { recordEntityChange } from "@/lib/enterprise-governance";
import { recordBusinessAudit } from "@/lib/ops";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import {
  enterpriseDealApiGuard,
  mapDealRouteError,
  resolveActorDisplayName,
} from "../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string }> };

/** POST — Restore Deal (soft-deleted or archived) */
export async function POST(request: Request, context: Ctx) {
  const { dealId } = await context.params;
  return withOpsRoute(
    request,
    {
      module: "Deal",
      action: "restore",
      endpoint: `/api/enterprise-deals/${dealId}/restore`,
    },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        let reason: string | null = null;
        try {
          const body = await request.json();
          reason = body?.reason ? String(body.reason) : null;
        } catch {
          reason = null;
        }
        const updated = await enterpriseDealService.restoreDeal(
          dealId,
          actor.userId,
          await resolveActorDisplayName(actor.userId),
          reason,
        );
        recordEntityChange({
          entityType: "EnterpriseDeal",
          entityId: dealId,
          action: "Restored",
          actorUserId: actor.userId,
          summary: "Enterprise Deal restored",
          previousValue: "deleted",
          newValue: "active",
          reason,
          correlationId,
        });
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Deal",
          action: "Deal Restored",
          entityId: dealId,
          previousValue: "deleted",
          newValue: "active",
          result: "Success",
          correlationId,
        });
        return successResponse(updated, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: `/api/enterprise-deals/${dealId}/restore`,
          });
        }
        return errorResponse(
          mapped.status,
          "DEAL_RESTORE_FAILED",
          mapped.body.error?.message ?? "Restore failed",
          undefined,
          {
            correlationId,
            module: "Deal",
            action: "restore",
            endpoint: `/api/enterprise-deals/${dealId}/restore`,
          },
        );
      }
    },
  );
}
