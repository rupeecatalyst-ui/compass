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
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ definitionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    documentRegistryPersistenceGuard();
    requireAccessToken(_request);
    const { definitionId } = await context.params;
    const record = await documentRegistryService.getDefinitionById(definitionId);
    if (!record) return notFound("Document definition not found");
    return successResponse(record);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "DOCUMENT_DEFINITION_GET_FAILED", "Failed to load document definition");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    documentRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireDocumentRegistryAdmin(actor);
    const { definitionId } = await context.params;
    const body = await request.json();

    const updated = await documentRegistryService.updateDefinition(
      definitionId,
      {
        label: body.label !== undefined ? String(body.label) : undefined,
        description: body.description,
        typeId: body.typeId ? String(body.typeId) : undefined,
        category: body.category,
        classification: body.classification,
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
    const message = err instanceof Error ? err.message : "Failed to update document definition";
    return errorResponse(400, "DOCUMENT_DEFINITION_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    documentRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireDocumentRegistryAdmin(actor);
    const { definitionId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const deleted = await documentRegistryService.softDeleteDefinition(
      definitionId,
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
    const message = err instanceof Error ? err.message : "Failed to delete document definition";
    return errorResponse(400, "DOCUMENT_DEFINITION_DELETE_FAILED", message);
  }
}
