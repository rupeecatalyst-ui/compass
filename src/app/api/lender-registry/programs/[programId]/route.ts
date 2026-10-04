import { errorResponse, fromAuthError, requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import {
  ProgrammeConflictError,
  ProgrammePermissionError,
  ProgrammeValidationError,
} from "@/types/product-programme-operations";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { productProgrammeOperationsService } from "@server/services/product-programme-operations/programme.service";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
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



    const updated = await productProgrammeOperationsService.update({
      organizationId: await resolvePilotOrganizationId(),
      actorUserId: actor.userId,
      actorName: await resolveActorDisplayName(actor.userId),
      actorRole: actor.role,
      programId,
      body,
    });

    return successResponse(updated);

  } catch (err) {
    if (err instanceof ProgrammeValidationError) {
      return errorResponse(400, err.code, err.message);
    }
    if (err instanceof ProgrammePermissionError) {
      return errorResponse(403, err.code, err.message);
    }
    if (err instanceof ProgrammeConflictError) {
      return errorResponse(409, err.code, err.message);
    }

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


