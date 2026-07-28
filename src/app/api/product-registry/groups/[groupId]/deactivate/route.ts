import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { productRegistryService } from "@server/services/product-registry/product-registry.service";
import {
  mapRouteError,
  productRegistryPersistenceGuard,
  requireProductRegistryAdmin,
  resolveActorDisplayName,
} from "../../../_lib/route-utils";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const { groupId } = await context.params;
    const updated = await productRegistryService.deactivateGroup(
      groupId,
      actor.userId,
      await resolveActorDisplayName(actor.userId),
    );
    return successResponse(updated);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to deactivate product group";
    return errorResponse(400, "PRODUCT_GROUP_DEACTIVATE_FAILED", message);
  }
}
