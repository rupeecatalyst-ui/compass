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

type RouteContext = { params: Promise<{ categoryId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    requireAccessToken(_request);
    const { categoryId } = await context.params;
    const record = await productRegistryService.getCategoryById(categoryId);
    if (!record) return notFound("Product category not found");
    return successResponse(record);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "PRODUCT_CATEGORY_GET_FAILED", "Failed to load product category");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const { categoryId } = await context.params;
    const body = await request.json();

    const updated = await productRegistryService.updateCategory(
      categoryId,
      {
        label: body.label !== undefined ? String(body.label) : undefined,
        description: body.description,
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
    const message = err instanceof Error ? err.message : "Failed to update product category";
    return errorResponse(400, "PRODUCT_CATEGORY_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const { categoryId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const deleted = await productRegistryService.softDeleteCategory(
      categoryId,
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
    const message = err instanceof Error ? err.message : "Failed to delete product category";
    return errorResponse(400, "PRODUCT_CATEGORY_DELETE_FAILED", message);
  }
}
