import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { documentRegistryService } from "@server/services/document-registry/document-registry.service";
import {
  documentRegistryPersistenceGuard,
  mapRouteError,
  notFound,
  requireDocumentRegistryAdmin,
  resolveActorDisplayName,
} from "../../../_lib/route-utils";

type RouteContext = { params: Promise<{ typeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    documentRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireDocumentRegistryAdmin(actor);
    const { typeId } = await context.params;

    const updated = await documentRegistryService.deactivateType(
      typeId,
      actor.userId,
      await resolveActorDisplayName(actor.userId),
    );
    return successResponse(updated);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to deactivate document type";
    if (message.includes("not found")) return notFound("Document type not found");
    return errorResponse(400, "DOCUMENT_TYPE_DEACTIVATE_FAILED", message);
  }
}
