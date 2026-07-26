import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string }> };

/** GET — list snapshots · POST — append historical snapshot */
export async function GET(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    requireAccessToken(request);
    const { dealId } = await context.params;
    const items = await enterpriseDealService.listSnapshots(dealId);
    return successResponse({ items });
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "DEAL_SNAPSHOT_LIST_FAILED", mapped.body.error?.message ?? "List failed");
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId } = await context.params;
    const body = await request.json();
    const row = await enterpriseDealService.appendSnapshot(
      dealId,
      String(body.reason ?? ""),
      (body.snapshot ?? {}) as Record<string, unknown>,
      actor.userId,
    );
    return successResponse(row, 201);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "DEAL_SNAPSHOT_APPEND_FAILED",
      mapped.body.error?.message ?? "Append failed",
    );
  }
}
