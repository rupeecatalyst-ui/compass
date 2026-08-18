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
import type { RaiseEnterpriseAccountingInvoiceInput } from "@/types/enterprise-accounting-invoice";

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

export async function GET(request: Request) {
  try {
    guard();
    requireAccessToken(request);
    const result = await enterpriseAccountingInvoiceService.list();
    return successResponse(result);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to list invoices";
    return errorResponse(status || 500, "ACCOUNTING_INVOICE_LIST_FAILED", message);
  }
}

export async function POST(request: Request) {
  try {
    guard();
    const actor = requireAccessToken(request);
    if (!isAccountingInvoiceRaiseRole(actor.role)) {
      throw Object.assign(new Error("Only ADMIN or SUPER_ADMIN may Raise Invoice"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const body = (await request.json()) as RaiseEnterpriseAccountingInvoiceInput;
    const created = await enterpriseAccountingInvoiceService.raise(body, actor.userId);
    return successResponse(created, 201);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to raise invoice";
    return errorResponse(status || 500, "ACCOUNTING_INVOICE_RAISE_FAILED", message);
  }
}
