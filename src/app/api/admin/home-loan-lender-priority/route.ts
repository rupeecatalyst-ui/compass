/**
 * CO-HL-PROGRAM-001 — Home Loan eligible lenders + selection priority.
 * GET  /api/admin/home-loan-lender-priority
 * PUT  /api/admin/home-loan-lender-priority  { items: [{ lenderId, priorityRank }] }
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
  listHomeLoanEligibleLenders,
  saveHomeLoanLenderPriorities,
} from "@server/services/product-lender-priority/home-loan-priority.service";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Requires ENTERPRISE_PERSISTENCE_MODE=prisma"), {
      statusCode: 503,
      code: "PERSISTENCE_REQUIRED",
    });
  }
}

export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const data = await listHomeLoanEligibleLenders();
    return successResponse(data);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to load Home Loan lenders";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    return errorResponse(statusCode, "HL_PRIORITY_GET_FAILED", message);
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
    const items = Array.isArray(body.items) ? body.items : null;
    if (!items) {
      return errorResponse(400, "INVALID_BODY", "items[] required");
    }
    const rows = await saveHomeLoanLenderPriorities({
      items,
      actorId: actor.userId || actor.email || "admin",
    });
    return successResponse({
      productFamily: "HOME_LOAN",
      savedCount: items.length,
      rows,
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const message = err instanceof Error ? err.message : "Failed to save Home Loan priorities";
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : "HL_PRIORITY_PUT_FAILED";
    return errorResponse(statusCode, code, message);
  }
}
