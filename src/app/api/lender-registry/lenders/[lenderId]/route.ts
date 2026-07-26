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



type RouteContext = { params: Promise<{ lenderId: string }> };



export async function GET(_request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    requireAccessToken(_request);

    const { lenderId } = await context.params;

    const record = await lenderRegistryService.getLenderById(lenderId);

    if (!record) return notFound("Lender not found");

    return successResponse(record);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    return errorResponse(500, "LENDER_GET_FAILED", "Failed to load lender");

  }

}



export async function PATCH(request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const { lenderId } = await context.params;

    const body = await request.json();



    const updated = await lenderRegistryService.updateLender(

      lenderId,

      {

        label: body.label !== undefined ? String(body.label) : undefined,

        description: body.description,

        categoryId: body.categoryId ? String(body.categoryId) : undefined,

        institutionCategory: body.institutionCategory,

        lifecycleStatus: body.lifecycleStatus,

        operationalStatus: body.operationalStatus,

        countryReferenceId: body.countryReferenceId,

        stateReferenceId: body.stateReferenceId,

        cityReferenceId: body.cityReferenceId,

        headquartersLabel: body.headquartersLabel,

        website: body.website,

        tags: body.tags === null ? null : Array.isArray(body.tags) ? body.tags.map(String) : undefined,

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

    const message = err instanceof Error ? err.message : "Failed to update lender";

    return errorResponse(400, "LENDER_UPDATE_FAILED", message);

  }

}



export async function DELETE(request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const { lenderId } = await context.params;

    const body = await request.json().catch(() => ({}));



    const deleted = await lenderRegistryService.softDeleteLender(

      lenderId,

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

    const message = err instanceof Error ? err.message : "Failed to delete lender";

    return errorResponse(400, "LENDER_DELETE_FAILED", message);

  }

}


