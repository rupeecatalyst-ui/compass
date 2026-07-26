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
  parseListQuery,
  productRegistryPersistenceGuard,
  requireProductRegistryAdmin,
  resolveActorDisplayName,
} from "../_lib/route-utils";

export async function GET(request: Request) {
  try {
    productRegistryPersistenceGuard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const result = await productRegistryService.queryGroups({
      ...parseListQuery(url),
      categoryId: url.searchParams.get("categoryId") ?? undefined,
    });
    return successResponse(result);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(500, "PRODUCT_GROUP_QUERY_FAILED", "Failed to query product groups");
  }
}

export async function POST(request: Request) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const body = await request.json();

    const created = await productRegistryService.createGroup(
      {
        categoryId: String(body.categoryId ?? ""),
        code: String(body.code ?? ""),
        label: String(body.label ?? ""),
        description: body.description ? String(body.description) : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        status: body.status,
        enabled: body.enabled,
        notes: body.notes ? String(body.notes) : undefined,
        createdBy: actor.userId,
      },
      await resolveActorDisplayName(actor.userId),
    );
    return successResponse(created, 201);
  } catch (err) {
    const mapped = mapRouteError(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to create product group";
    return errorResponse(400, "PRODUCT_GROUP_CREATE_FAILED", message);
  }
}
