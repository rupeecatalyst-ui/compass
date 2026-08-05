import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { ProductLifecycleStatus, ProductOperationalStatus } from "@/types/enterprise-product-registry";
import { productRegistryService } from "@server/services/product-registry/product-registry.service";
import {
  mapRouteError,
  parseListQuery,
  productRegistryErrorResponse,
  productRegistryPersistenceGuard,
  requireProductRegistryAdmin,
  resolveActorDisplayName,
} from "../_lib/route-utils";
import {
  classifyProductsForPresentation,
  filterCanonicalProductsForPresentation,
} from "@/lib/enterprise-product-master/presentation-canonical";

export async function GET(request: Request) {
  try {
    productRegistryPersistenceGuard();
    requireAccessToken(request);
    const url = new URL(request.url);
    // CO-PR-005 — default list is canonical-only (presentation). Use presentation=all
    // for read-only inventory / historical inspection — never mutates rows.
    const presentation = (url.searchParams.get("presentation") || "canonical").toLowerCase();
    const result = await productRegistryService.queryProducts({
      ...parseListQuery(url),
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      groupId: url.searchParams.get("groupId") ?? undefined,
      lifecycleStatus:
        (url.searchParams.get("lifecycleStatus") as ProductLifecycleStatus | "all") ?? "all",
      operationalStatus:
        (url.searchParams.get("operationalStatus") as ProductOperationalStatus | "all") ?? "all",
    });

    if (presentation === "all") {
      const classified = classifyProductsForPresentation(result.items);
      return successResponse({
        ...result,
        items: classified,
        total: classified.length,
        presentation: "all",
        presentationNote:
          "Legacy / Historical rows are retained for compatibility. Prefer presentation=canonical for administration.",
      });
    }

    const canonical = filterCanonicalProductsForPresentation(result.items);
    return successResponse({
      ...result,
      items: canonical,
      total: canonical.length,
      presentation: "canonical",
      presentationNote:
        "Showing canonical Products only. Historical duplicates remain in the database and are not selectable.",
    });
  } catch (err) {
    const mapped = productRegistryErrorResponse(err, "PRODUCT_QUERY_FAILED", "Failed to query products");
    if (mapped.status === 401) {
      return fromAuthError(mapped as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "PRODUCT_QUERY_FAILED",
      mapped.body.error?.message ?? "Failed to query products",
    );
  }
}

export async function POST(request: Request) {
  try {
    productRegistryPersistenceGuard();
    const actor = requireAccessToken(request);
    requireProductRegistryAdmin(actor);
    const body = await request.json();
    const code = String(body.code ?? "");
    const label = String(body.label ?? "");

    const { assertCreateWouldNotBeLegacyDuplicate } = await import(
      "@/lib/enterprise-product-master/presentation-guards"
    );
    await assertCreateWouldNotBeLegacyDuplicate({ code, label });

    const created = await productRegistryService.createProduct(
      {
        categoryId: String(body.categoryId ?? ""),
        groupId: String(body.groupId ?? ""),
        code,
        label,
        description: body.description ? String(body.description) : undefined,
        shortDescription: body.shortDescription ? String(body.shortDescription) : undefined,
        lifecycleStatus: body.lifecycleStatus,
        operationalStatus: body.operationalStatus,
        majorVersion: body.majorVersion !== undefined ? Number(body.majorVersion) : undefined,
        minorVersion: body.minorVersion !== undefined ? Number(body.minorVersion) : undefined,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
        productOwner: body.productOwner ? String(body.productOwner) : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
        parentProductId: body.parentProductId ? String(body.parentProductId) : undefined,
        isSecured: body.isSecured !== undefined ? Boolean(body.isSecured) : undefined,
        customerSegment: Array.isArray(body.customerSegment)
          ? body.customerSegment.map(String)
          : undefined,
        remarks: body.remarks ? String(body.remarks) : undefined,
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
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 400;
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : "PRODUCT_CREATE_FAILED";
    const message = err instanceof Error ? err.message : "Failed to create product";
    return errorResponse(statusCode, code, message);
  }
}
