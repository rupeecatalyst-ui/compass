import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isAccountingPaymentRole } from "@/constants/enterprise-accounting-payment";
import { enterpriseAccountingPaymentService } from "@server/services/enterprise-accounting-payment/enterprise-accounting-payment.service";
import type { PostEnterpriseAccountingPaymentInput } from "@/types/enterprise-accounting-payment";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Accounting Payment requires prisma persistence"), {
      status: 503,
      body: {
        success: false,
        error: { code: "PERSISTENCE_MODE_REQUIRED", message: "Prisma persistence required" },
      } satisfies ApiResponse<unknown>,
    });
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    if (!isAccountingPaymentRole(actor.role)) {
      throw Object.assign(new Error("Only ADMIN or SUPER_ADMIN may Post Payment"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const body = (await request.json()) as PostEnterpriseAccountingPaymentInput;
    const created = await enterpriseAccountingPaymentService.post(body, actor.userId);
    return successResponse(created, 201);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to post payment";
    return errorResponse(status || 500, "ACCOUNTING_PAYMENT_POST_FAILED", message);
  }
}
