import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isAccountingInvoiceRaiseRole } from "@/constants/enterprise-accounting-invoice";
import { enterpriseAccountingGstRateService } from "@server/services/enterprise-accounting-gst-rate/enterprise-accounting-gst-rate.service";
import type { CreateEnterpriseAccountingGstRateInput } from "@/types/enterprise-accounting-gst-rate";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("GST Rate Master requires prisma persistence"), {
      status: 503,
      body: {
        success: false,
        error: { code: "PERSISTENCE_MODE_REQUIRED", message: "Prisma persistence required" },
      } satisfies ApiResponse<unknown>,
    });
  }
}

function requireAdministrator(role: string) {
  if (!isAccountingInvoiceRaiseRole(role)) {
    throw Object.assign(new Error("Only ADMIN or SUPER_ADMIN may manage GST Rate Master"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    requireAdministrator(actor.role);
    const url = new URL(request.url);
    const items = await enterpriseAccountingGstRateService.list({
      activeOnly: url.searchParams.get("activeOnly") === "true",
      enabled:
        url.searchParams.get("enabled") === "true"
          ? true
          : url.searchParams.get("enabled") === "false"
            ? false
            : undefined,
    });
    return successResponse({ items });
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to list GST rates";
    return errorResponse(status || 500, "GST_RATE_LIST_FAILED", message);
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    requireAdministrator(actor.role);
    const body = (await request.json()) as CreateEnterpriseAccountingGstRateInput;
    const created = await enterpriseAccountingGstRateService.create(body, actor.userId);
    return successResponse(created, 201);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to create GST rate";
    return errorResponse(status || 500, "GST_RATE_CREATE_FAILED", message);
  }
}
