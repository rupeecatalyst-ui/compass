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

type RouteContext = { params: Promise<{ typeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    documentRegistryPersistenceGuard();
    requireAccessToken(_request);
    const { typeId } = await context.params;
    const record = await documentRegistryService.getTypeById(typeId);
    if (!record) return notFound("Document type not found");
    return successResponse(record);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "DOCUMENT_TYPE_GET_FAILED", "Failed to load document type");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    documentRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireDocumentRegistryAdmin(actor);
    const { typeId } = await context.params;
    const body = await request.json();

    const updated = await documentRegistryService.updateType(
      typeId,
      {
        label: body.label !== undefined ? String(body.label) : undefined,
        description: body.description,
        category: body.category,
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
    const message = err instanceof Error ? err.message : "Failed to update document type";
    return errorResponse(400, "DOCUMENT_TYPE_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    documentRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireDocumentRegistryAdmin(actor);
    const { typeId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const deleted = await documentRegistryService.softDeleteType(
      typeId,
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
    const message = err instanceof Error ? err.message : "Failed to delete document type";
    return errorResponse(400, "DOCUMENT_TYPE_DELETE_FAILED", message);
  }
}
