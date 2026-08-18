import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ConfirmPostDisbursementInput } from "@/types/enterprise-accounting-case";
import { postDisbursementConfirmationService } from "@server/services/post-disbursement-confirmation/post-disbursement-confirmation.service";

type Ctx = { params: Promise<{ dealId: string }> };

function requireAdministrator(role: string) {
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can confirm disbursement"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor.role);
    const { dealId } = await context.params;
    const body = (await request.json()) as ConfirmPostDisbursementInput;
    const result = await postDisbursementConfirmationService.receiveConfirmation(
      dealId,
      body,
      actor.userId,
    );
    return successResponse(result);
  } catch (error) {
    const auth = error as { status?: number; body?: unknown };
    if (auth.status && auth.body) {
      return errorResponse(auth.status, "AUTH_ERROR", "Authentication required");
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      status,
      (error as { code?: string }).code ?? "CONFIRMATION_FAILED",
      error instanceof Error ? error.message : "Confirmation failed",
    );
  }
}
