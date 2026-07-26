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

} from "../../_lib/route-utils";



type RouteContext = { params: Promise<{ categoryId: string }> };



export async function GET(_request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    requireAccessToken(_request);

    const { categoryId } = await context.params;

    const record = await lenderRegistryService.getCategoryById(categoryId);

    if (!record) return notFound("Lender category not found");

    return successResponse(record);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    return errorResponse(500, "LENDER_CATEGORY_GET_FAILED", "Failed to load lender category");

  }

}



export async function PATCH(request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const { categoryId } = await context.params;

    const body = await request.json();



    const updated = await lenderRegistryService.updateCategory(

      categoryId,

      {

        label: body.label !== undefined ? String(body.label) : undefined,

        description: body.description,

        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,

        status: body.status,

        enabled: body.enabled,

        notes: body.notes,

        modifiedBy: actor.userId,

      },

      await resolveActorDisplayName(actor.userId),

    );

    return successResponse(updated);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401 || mapped.status === 403) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    const message = err instanceof Error ? err.message : "Failed to update lender category";

    return errorResponse(400, "LENDER_CATEGORY_UPDATE_FAILED", message);

  }

}



export async function DELETE(request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const { categoryId } = await context.params;

    const body = await request.json().catch(() => ({}));



    const deleted = await lenderRegistryService.softDeleteCategory(

      categoryId,

      actor.userId,

      body.reason ? String(body.reason) : undefined,

      await resolveActorDisplayName(actor.userId),

    );

    return successResponse(deleted);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401 || mapped.status === 403) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    const message = err instanceof Error ? err.message : "Failed to delete lender category";

    return errorResponse(400, "LENDER_CATEGORY_DELETE_FAILED", message);

  }

}


