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

  notFound,

  requireLenderRegistryAdmin,

  resolveActorDisplayName,

} from "../../../_lib/route-utils";



type RouteContext = { params: Promise<{ categoryId: string }> };



export async function POST(request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const { categoryId } = await context.params;



    const updated = await lenderRegistryService.activateCategory(

      categoryId,

      actor.userId,

      await resolveActorDisplayName(actor.userId),

    );

    return successResponse(updated);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401 || mapped.status === 403) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    const message = err instanceof Error ? err.message : "Failed to activate lender category";

    if (message.includes("not found")) return notFound("Lender category not found");

    return errorResponse(400, "LENDER_CATEGORY_ACTIVATE_FAILED", message);

  }

}


