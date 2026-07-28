/**
 * Today's New Deals KPI — Deal Registry createdAt today.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
  withOpsRoute,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import {
  enterpriseDealApiGuard,
  mapDealRouteError,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  return withOpsRoute(
    request,
    { module: "Deal", action: "today_new_kpis", endpoint: "/api/enterprise-deals/today-new" },
    async ({ correlationId }) => {
      try {
        enterpriseDealApiGuard();
        requireAccessToken(request);
        const data = await enterpriseDealService.getTodayNewDealKpis();
        return successResponse(data, 200, correlationId);
      } catch (err) {
        const mapped = mapDealRouteError(err);
        if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
          return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> }, {
            correlationId,
            endpoint: "/api/enterprise-deals/today-new",
          });
        }
        return errorResponse(
          mapped.status,
          "TODAY_NEW_DEAL_KPI_FAILED",
          mapped.body.error?.message ?? "Failed to load Today's New Deals",
          undefined,
          { correlationId },
        );
      }
    },
  );
}
