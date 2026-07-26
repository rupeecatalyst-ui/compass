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
  enterpriseDealApiGuard,
  mapDealRouteError,
  parseDealSearchQuery,
} from "./_lib/route-utils";

/** GET — Search Deals · POST — Create Deal */
export async function GET(request: Request) {
  return withOpsRoute(
    request,
    { module: "Deal", action: "search", endpoint: "/api/enterprise-deals" },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        const url = new URL(request.url);
        const result = await enterpriseDealService.searchDeals(
          parseDealSearchQuery(url, actor.userId),
        );
        return successResponse(result, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: "/api/enterprise-deals",
          });
        }
        return errorResponse(
          mapped.status,
          "DEAL_SEARCH_FAILED",
          mapped.body.error?.message ?? "Search failed",
          undefined,
          { correlationId, module: "Deal", action: "search", endpoint: "/api/enterprise-deals" },
        );
      }
    },
  );
}

export async function POST(request: Request) {
  return withOpsRoute(
    request,
    { module: "Deal", action: "create", endpoint: "/api/enterprise-deals" },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        const actor = requireAccessToken(request);
        const body = (await request.json()) as Record<string, unknown>;
        const created = await enterpriseDealService.createDeal(body, actor.userId);
        const entityId =
          created && typeof created === "object" && "id" in created
            ? String((created as { id: unknown }).id)
            : null;
        recordBusinessAudit({
          actorUserId: actor.userId,
          module: "Deal",
          action: "Deal Created",
          entityId,
          previousValue: null,
          newValue: entityId ? `deal:${entityId}` : "created",
          result: "Success",
          correlationId,
        });
        return successResponse(created, 201, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (
          mapped.status === 401 ||
          mapped.status === 403 ||
          mapped.status === 404 ||
          mapped.status === 503
        ) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: "/api/enterprise-deals",
          });
        }
        return errorResponse(
          mapped.status,
          mapped.body.error?.code ?? "DEAL_CREATE_FAILED",
          mapped.body.error?.message ?? "Failed to create Deal",
          undefined,
          { correlationId, module: "Deal", action: "create", endpoint: "/api/enterprise-deals" },
        );
      }
    },
  );
}
