import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isAccountingCreditNoteRole } from "@/constants/enterprise-accounting-credit-note";
import { enterpriseAccountingCreditNoteService } from "@server/services/enterprise-accounting-invoice/enterprise-accounting-credit-note.service";
import type { CreateEnterpriseAccountingCreditNoteInput } from "@/types/enterprise-accounting-credit-note";

function guard() {
  if (!isEnterprisePersistencePrisma()) {
    throw Object.assign(new Error("Accounting Credit Note requires prisma persistence"), {
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
    if (!isAccountingCreditNoteRole(actor.role)) {
      throw Object.assign(new Error("Only ADMIN or SUPER_ADMIN may Issue Credit Note"), {
        statusCode: 403,
        code: "FORBIDDEN",
      });
    }
    const body = (await request.json()) as CreateEnterpriseAccountingCreditNoteInput;
    const created = await enterpriseAccountingCreditNoteService.create(body, actor.userId);
    return successResponse(created, 201);
  } catch (err) {
    if (typeof err === "object" && err && "status" in err && "body" in err) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    const message = err instanceof Error ? err.message : "Failed to create credit note";
    return errorResponse(status || 500, "ACCOUNTING_CREDIT_NOTE_CREATE_FAILED", message);
  }
}
