import { errorResponse, fromAuthError, requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import {
  ProgrammeConflictError,
  ProgrammePermissionError,
  ProgrammeValidationError,
} from "@/types/product-programme-operations";
import { productProgrammeOperationsService } from "@server/services/product-programme-operations/programme.service";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  lenderRegistryPersistenceGuard,
  mapRouteError,
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
    const body = (await request.json().catch(() => ({}))) as { action?: string; approvalReason?: string };
    const organizationId = await resolvePilotOrganizationId();
    const actorName = await resolveActorDisplayName(actor.userId);
    const base = {
      organizationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      programId,
      actorName,
    };
    if (body.action === "submit") return successResponse(await productProgrammeOperationsService.submit(base));
    if (body.action === "approve") {
      return successResponse(
        await productProgrammeOperationsService.approve({ ...base, approvalReason: body.approvalReason }),
      );
    }
    if (body.action === "publish") return successResponse(await productProgrammeOperationsService.publish(base));
    return errorResponse(400, "UNKNOWN_WORKFLOW_ACTION", "Action must be submit, approve or publish.");
  } catch (err) {
    if (err instanceof ProgrammeValidationError) {
      return Response.json(
        { success: false, error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors } },
        { status: 400 },
      );
    }
    if (err instanceof ProgrammePermissionError) return errorResponse(403, err.code, err.message);
    if (err instanceof ProgrammeConflictError) return errorResponse(409, err.code, err.message);
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Workflow failed";
    return errorResponse(400, "PROGRAMME_WORKFLOW_FAILED", message);
  }
}
