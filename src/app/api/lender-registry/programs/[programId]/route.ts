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



type RouteContext = { params: Promise<{ programId: string }> };



export async function GET(_request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    requireAccessToken(_request);

    const { programId } = await context.params;

    const record = await lenderRegistryService.getProgramById(programId);

    if (!record) return notFound("Lender program not found");

    return successResponse(record);

  } catch (err) {

    const mapped = mapRouteError(err);

    if (mapped.status === 401) {

      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });

    }

    return errorResponse(500, "LENDER_PROGRAM_GET_FAILED", "Failed to load lender program");

  }

}



export async function PATCH(request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const { programId } = await context.params;

    const body = await request.json();



    const updated = await lenderRegistryService.updateProgram(

      programId,

      {

        label: body.label !== undefined ? String(body.label) : undefined,

        description: body.description,

        lenderId: body.lenderId ? String(body.lenderId) : undefined,

        productId: body.productId === null ? null : body.productId ? String(body.productId) : undefined,

        lifecycleStatus: body.lifecycleStatus,

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

    const message = err instanceof Error ? err.message : "Failed to update lender program";

    return errorResponse(400, "LENDER_PROGRAM_UPDATE_FAILED", message);

  }

}



export async function DELETE(request: Request, context: RouteContext) {

  try {

    lenderRegistryPersistenceGuard();

    const actor = requireAccessToken(request);

    requireLenderRegistryAdmin(actor);

    const { programId } = await context.params;

    const body = await request.json().catch(() => ({}));



    const deleted = await lenderRegistryService.softDeleteProgram(

      programId,

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

    const message = err instanceof Error ? err.message : "Failed to delete lender program";

    return errorResponse(400, "LENDER_PROGRAM_DELETE_FAILED", message);

  }

}


