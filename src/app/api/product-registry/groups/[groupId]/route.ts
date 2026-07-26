import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { productRegistryService } from "@server/services/product-registry/product-registry.service";
import {
  mapRouteError,
  notFound,
  productRegistryPersistenceGuard,
  requireProductRegistryAdmin,
  resolveActorDisplayName,
} from "../../_lib/route-utils";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    requireAccessToken(_request);
    const { groupId } = await context.params;
    const record = await productRegistryService.getGroupById(groupId);
    if (!record) return notFound("Product group not found");
    return successResponse(record);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "PRODUCT_GROUP_GET_FAILED", "Failed to load product group");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const { groupId } = await context.params;
    const body = await request.json();

    const updated = await productRegistryService.updateGroup(
      groupId,
      {
        label: body.label !== undefined ? String(body.label) : undefined,
        description: body.description,
        categoryId: body.categoryId ? String(body.categoryId) : undefined,
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
    const message = err instanceof Error ? err.message : "Failed to update product group";
    return errorResponse(400, "PRODUCT_GROUP_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const { groupId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const deleted = await productRegistryService.softDeleteGroup(
      groupId,
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
    const message = err instanceof Error ? err.message : "Failed to delete product group";
    return errorResponse(400, "PRODUCT_GROUP_DELETE_FAILED", message);
  }
}
