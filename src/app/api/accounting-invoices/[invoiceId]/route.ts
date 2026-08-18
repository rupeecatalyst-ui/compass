import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { enterpriseAccountingInvoiceService } from "@server/services/enterprise-accounting-invoice/enterprise-accounting-invoice.service";

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

// Phase 1 immutability: no PATCH / PUT / DELETE. Raised billed amounts, party snapshot,
// GST/TDS, invoice number, and invoice date are not writable after raise.
export async function GET(request: Request, context: Ctx) {
  try {
    guard();
    requireAccessToken(request);
    const { invoiceId } = await context.params;
    return successResponse(await enterpriseAccountingInvoiceService.get(invoiceId));
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to load invoice";
    return errorResponse(status || 500, "ACCOUNTING_INVOICE_GET_FAILED", message);
  }
}
