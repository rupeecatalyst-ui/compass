import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { lenderRegistryService } from "@server/services/lender-registry/lender-registry.service";
import { productProgrammeOperationsService } from "@server/services/product-programme-operations/programme.service";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  ProgrammePermissionError,
  ProgrammeValidationError,
} from "@/types/product-programme-operations";
import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
  notFound,
  requireLenderRegistryAdmin,
  resolveActorDisplayName,
} from "../../../_lib/route-utils";

type RouteContext = { params: Promise<{ programId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    lenderRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireLenderRegistryAdmin(actor);
    const { programId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      expectedVersionNumber?: number;
      reason?: string | null;
    };
    if (body.action !== "unpublish" && body.action !== "republish") {
      return errorResponse(400, "PROGRAMME_ACTION_INVALID", "Action must be unpublish or republish.");
    }
    if (typeof body.expectedVersionNumber !== "number") {
      return errorResponse(400, "STALE_VERSION", "Reload this programme before changing publication.");
    }
    const current = await lenderRegistryService.getProgramById(programId);
    if (!current) return notFound("Lender program not found");
    if (
      current.versionNumber !== body.expectedVersionNumber &&
      current.lockVersion !== body.expectedVersionNumber
    ) {
      return errorResponse(400, "STALE_VERSION", "This programme was updated by someone else. Reload it and try again. No programme was changed.");
    }
    if (body.action === "unpublish") {
      const updated = await lenderRegistryService.governProgramme(
        programId,
        { action: "unpublish", expectedVersionNumber: body.expectedVersionNumber, reason: body.reason },
        actor.userId,
        await resolveActorDisplayName(actor.userId),
      );
      return successResponse(updated);
    }
    const organizationId = await resolvePilotOrganizationId();
    const updated = await productProgrammeOperationsService.publish({
      organizationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      actorName: await resolveActorDisplayName(actor.userId),
      programId,
    });
    return successResponse(updated);
  } catch (err) {
    if (err instanceof ProgrammeValidationError) {
      return Response.json(
        { success: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
        { status: 400 },
      );
    }
    if (err instanceof ProgrammePermissionError) return errorResponse(403, err.code, err.message);
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Programme publication change failed";
    if (message.includes("not found")) return notFound("Lender program not found");
    return errorResponse(400, "PROGRAMME_GOVERNANCE_FAILED", message);
  }
}
