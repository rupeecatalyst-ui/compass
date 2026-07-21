import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { referenceMasterService } from "@server/services/reference-master/reference-master.service";
import {
  mapRouteError,
  notFound,
  referenceMasterPersistenceGuard,
  requireReferenceMasterAdmin,
  resolveActorDisplayName,
} from "../_lib/route-utils";

type RouteContext = { params: Promise<{ masterId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    referenceMasterPersistenceGuard();
    requireAccessToken(_request);
    const { masterId } = await context.params;
    const record = await referenceMasterService.getById(masterId);
    if (!record) return notFound();
    return successResponse(record);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "REF_MASTER_GET_FAILED", "Failed to load reference master");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    referenceMasterPersistenceGuard();
    const actor = requireAccessToken(request);
    requireReferenceMasterAdmin(actor);
    const { masterId } = await context.params;
    const body = await request.json();

    const updated = await referenceMasterService.update(
      masterId,
      {
        label: body.label !== undefined ? String(body.label) : undefined,
        description: body.description,
        parentId: body.parentId,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        meta: body.meta,
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
    const message = err instanceof Error ? err.message : "Failed to update reference master";
    return errorResponse(400, "REF_MASTER_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    referenceMasterPersistenceGuard();
    const actor = requireAccessToken(request);
    requireReferenceMasterAdmin(actor);
    const { masterId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const deleted = await referenceMasterService.softDelete(
      masterId,
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
    const message = err instanceof Error ? err.message : "Failed to delete reference master";
    return errorResponse(400, "REF_MASTER_DELETE_FAILED", message);
  }
}
