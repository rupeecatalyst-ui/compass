import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { referenceMasterService } from "@server/services/reference-master/reference-master.service";
import {
  mapRouteError,
  referenceMasterPersistenceGuard,
  requireReferenceMasterAdmin,
  resolveActorDisplayName,
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ masterId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    referenceMasterPersistenceGuard();
    const actor = requireAccessToken(request);
    requireReferenceMasterAdmin(actor);
    const { masterId } = await context.params;
    const updated = await referenceMasterService.activate(
      masterId,
      actor.userId,
      await resolveActorDisplayName(actor.userId),
    );
    return successResponse(updated);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to activate reference master";
    return errorResponse(400, "REF_MASTER_ACTIVATE_FAILED", message);
  }
}
