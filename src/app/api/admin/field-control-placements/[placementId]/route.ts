import { formatAuthError } from "@server/validators/auth.validators";
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { recordCustomFieldAudit } from "@/lib/field-control-master/custom-field-audit";
import { CustomFieldPlacementError, setCustomFieldPlacementActive } from "@/lib/field-control-master/custom-field-placement";
import { loadPlacementDefinitions, prismaPlacementStore } from "@/lib/field-control-master/custom-field-persistence";

type RouteContext = { params: Promise<{ placementId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const token = requireAccessToken(request);
    const { placementId } = await context.params;
    const body: unknown = await request.json();
    const store = prismaPlacementStore();
    const current = await store.findById(placementId);
    if (!current) return errorResponse(404, "PLACEMENT_NOT_FOUND", "Placement was not found.");
    const placement = await setCustomFieldPlacementActive({
      placementId,
      body,
      actor: { role: token.role, userId: token.userId },
      definitions: await loadPlacementDefinitions(current.fieldLineageId),
      store,
      audit: recordCustomFieldAudit,
    });
    return successResponse({ placement });
  } catch (error) {
    if (error instanceof CustomFieldPlacementError) return errorResponse(error.statusCode, error.code, error.message);
    if (typeof error === "object" && error !== null && "status" in error) {
      return fromAuthError(error as { status: number; body: never });
    }
    return fromAuthError(formatAuthError(error));
  }
}
