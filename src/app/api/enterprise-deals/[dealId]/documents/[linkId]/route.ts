import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseDealService } from "@server/services/enterprise-deal/enterprise-deal.service";
import { assertDocumentStatus } from "@server/services/enterprise-deal/deal-validation";
import { enterpriseDealApiGuard, mapDealRouteError } from "../../../_lib/route-utils";

type Ctx = { params: Promise<{ dealId: string; linkId: string }> };

/** PATCH — update document link status / storage */
export async function PATCH(request: Request, context: Ctx) {
  try {
    enterpriseDealApiGuard();
    const actor = requireAccessToken(request);
    const { dealId, linkId } = await context.params;
    const body = await request.json();
    const row = await enterpriseDealService.updateDocument(dealId, linkId, {
      status: body.status ? assertDocumentStatus(body.status) : undefined,
      storageKey: body.storageKey,
      uploadedAt: body.uploadedAt,
      verifiedAt: body.verifiedAt,
      extension: body.extension,
      actorUserId: actor.userId,
    });
    return successResponse(row);
  } catch (err) {
    const mapped = mapDealRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "DEAL_DOCUMENT_UPDATE_FAILED",
      mapped.body.error?.message ?? "Update failed",
    );
  }
}
