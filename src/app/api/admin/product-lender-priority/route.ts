/**
 * CO-PRODUCT-PRIORITY-004 — Product-family eligible lenders + selection priority.
 * GET  /api/admin/product-lender-priority?family=LAP|COMM_PURCHASE|HOME_LOAN|PERSONAL_LOAN|BUSINESS_LOAN_UNSECURED
 * PUT  /api/admin/product-lender-priority  { productFamily, items: [{ lenderId, priorityRank }] }
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  PRODUCT_LENDER_PRIORITY_FAMILY,
  type ProductLenderPriorityFamily,
} from "@/lib/enterprise-product-lender-priority/compose-product-family-eligible";
import {
  listProductFamilyEligibleLenders,
  saveProductFamilyLenderPriorities,
} from "@server/services/product-lender-priority/product-family-priority.service";

const ALLOWED = new Set<string>(Object.values(PRODUCT_LENDER_PRIORITY_FAMILY));

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

function parseFamily(raw: string | null | undefined): ProductLenderPriorityFamily | null {
  const v = String(raw ?? "").trim().toUpperCase();
  if (!ALLOWED.has(v)) return null;
  return v as ProductLenderPriorityFamily;
}

export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const url = new URL(request.url);
    const productFamily = parseFamily(url.searchParams.get("family"));
    if (!productFamily) {
      return errorResponse(
        400,
        "INVALID_FAMILY",
        "Query family must be LAP, COMM_PURCHASE, HOME_LOAN, PERSONAL_LOAN, or BUSINESS_LOAN_UNSECURED",
      );
    }
    const data = await listProductFamilyEligibleLenders(productFamily);
    return successResponse(data);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message =
      err instanceof Error ? err.message : "Failed to load product-family lenders";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    return errorResponse(statusCode, "PRODUCT_PRIORITY_GET_FAILED", message);
  }
}

export async function PUT(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
      return errorResponse(403, "FORBIDDEN", "Admin role required");
    }
    const body = await request.json();
    const productFamily = parseFamily(body.productFamily ?? body.family);
    if (!productFamily) {
      return errorResponse(
        400,
        "INVALID_FAMILY",
        "productFamily must be LAP, COMM_PURCHASE, HOME_LOAN, PERSONAL_LOAN, or BUSINESS_LOAN_UNSECURED",
      );
    }
    const items = Array.isArray(body.items) ? body.items : null;
    if (!items) {
      return errorResponse(400, "INVALID_BODY", "items[] required");
    }
    const rows = await saveProductFamilyLenderPriorities({
      productFamily,
      items,
      actorId: actor.userId || actor.email || "admin",
    });
    return successResponse({
      productFamily,
      savedCount: items.length,
      rows,
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message =
      err instanceof Error ? err.message : "Failed to save product-family priorities";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : "PRODUCT_PRIORITY_PUT_FAILED";
    return errorResponse(statusCode, code, message);
  }
}
