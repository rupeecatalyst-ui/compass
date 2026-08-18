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
import type { UpdateEnterpriseAccountingGstRateInput } from "@/types/enterprise-accounting-gst-rate";

type Ctx = { params: Promise<{ rateId: string }> };

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

export async function GET(request: Request, context: Ctx) {
  try {
    guard();
    const actor = requireAccessToken(request);
    requireAdministrator(actor.role);
    const { rateId } = await context.params;
    return successResponse(await enterpriseAccountingGstRateService.get(rateId));
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to load GST rate";
    return errorResponse(status || 500, "GST_RATE_GET_FAILED", message);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    guard();
    const actor = requireAccessToken(request);
    requireAdministrator(actor.role);
    const { rateId } = await context.params;
    const body = (await request.json()) as UpdateEnterpriseAccountingGstRateInput;
    return successResponse(
      await enterpriseAccountingGstRateService.update(rateId, body, actor.userId),
    );
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to update GST rate";
    return errorResponse(status || 500, "GST_RATE_UPDATE_FAILED", message);
  }
}
