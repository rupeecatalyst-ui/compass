import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isAccountingInvoiceRaiseRole } from "@/constants/enterprise-accounting-invoice";
import { enterpriseAccountingInvoiceService } from "@server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service";
import type { ApplyInvoiceSignatureInput } from "@/types/enterprise-accounting-invoice";

type Ctx = { params: Promise<{ invoiceId: string }> };

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Accounting Invoice requires prisma persistence"), {
      status: 503,
      body: {
        success: false,
        error: { code: "PERSISTENCE_MODE_REQUIRED", message: "Prisma persistence required" },
      } satisfies ApiResponse<unknown>,
    });
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    guard();
    const actor = requireAccessToken(request);
    if (!isAccountingInvoiceRaiseRole(actor.role)) {
      throw Object.assign(new Error("Only ADMIN or SUPER_ADMIN may apply invoice signature"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const { invoiceId } = await context.params;
    const body = (await request.json()) as ApplyInvoiceSignatureInput;
    const updated = await enterpriseAccountingInvoiceService.applyDigitalSignature(
      { ...body, invoiceId },
      actor.userId,
    );
    return successResponse(updated);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to apply signature";
    return errorResponse(status || 500, "ACCOUNTING_INVOICE_SIGNATURE_FAILED", message);
  }
}
