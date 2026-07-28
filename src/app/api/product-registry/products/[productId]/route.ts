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

type RouteContext = { params: Promise<{ productId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    requireAccessToken(_request);
    const { productId } = await context.params;
    const record = await productRegistryService.getProductById(productId);
    if (!record) return notFound("Product not found");
    return successResponse(record);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "PRODUCT_GET_FAILED", "Failed to load product");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const { productId } = await context.params;
    const body = await request.json();

    const updated = await productRegistryService.updateProduct(
      productId,
      {
        label: body.label !== undefined ? String(body.label) : undefined,
        description: body.description,
        shortDescription: body.shortDescription,
        categoryId: body.categoryId ? String(body.categoryId) : undefined,
        groupId: body.groupId ? String(body.groupId) : undefined,
        lifecycleStatus: body.lifecycleStatus,
        operationalStatus: body.operationalStatus,
        majorVersion: body.majorVersion !== undefined ? Number(body.majorVersion) : undefined,
        minorVersion: body.minorVersion !== undefined ? Number(body.minorVersion) : undefined,
        tags: body.tags === null ? null : Array.isArray(body.tags) ? body.tags.map(String) : undefined,
        productOwner: body.productOwner,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        parentProductId:
          body.parentProductId === null
            ? null
            : body.parentProductId
              ? String(body.parentProductId)
              : undefined,
        isSecured:
          body.isSecured === null
            ? null
            : body.isSecured !== undefined
              ? Boolean(body.isSecured)
              : undefined,
        customerSegment:
          body.customerSegment === null
            ? null
            : Array.isArray(body.customerSegment)
              ? body.customerSegment.map(String)
              : undefined,
        remarks: body.remarks,
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
    const message = err instanceof Error ? err.message : "Failed to update product";
    return errorResponse(400, "PRODUCT_UPDATE_FAILED", message);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const { productId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const deleted = await productRegistryService.softDeleteProduct(
      productId,
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
    const message = err instanceof Error ? err.message : "Failed to delete product";
    return errorResponse(400, "PRODUCT_DELETE_FAILED", message);
  }
}
