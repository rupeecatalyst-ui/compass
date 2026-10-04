import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  requireLenderRegistryAdmin,
  resolveActorDisplayName,
} from "../../_lib/route-utils";

export async function POST(request: Request) {
  try {
    lenderRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireLenderRegistryAdmin(actor);
    const body = await request.json();
    const sourceId = String(body.sourceLenderId ?? "").trim();
    const targetId = String(body.targetLenderId ?? "").trim();
    if (!sourceId || !targetId) throw new Error("Source and target lender are required.");
    if (body.execute === true) {
      const reason = String(body.reason ?? "").trim();
      if (!reason) throw new Error("A merge reason is required.");
      return successResponse(await lenderRegistryService.mergeLenders({
        sourceId,
        targetId,
        reason,
        actorUserId: actor.userId,
        actorName: await resolveActorDisplayName(actor.userId),
      }));
    }
    return successResponse(await lenderRegistryService.previewLenderMerge(sourceId, targetId));
  } catch (error) {
    const mapped = mapRouteError(error);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(mapped.status, "LENDER_MERGE_FAILED", error instanceof Error ? error.message : "Lender merge failed");
  }
}
