import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { UpdateEnterpriseAccountingCaseInput } from "@/types/enterprise-accounting-case";
import { enterpriseAccountingCaseService } from "@server/services/enterprise-accounting-case/enterprise-accounting-case.service";

type Ctx = { params: Promise<{ caseId: string }> };

function requireAdministrator(role: string) {
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can update Accounting Cases"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function routeError(error: unknown, fallback: string) {
  const auth = error as { status?: number; body?: unknown };
  if (auth.status && auth.body) {
    return errorResponse(auth.status, "AUTH_ERROR", "Authentication required");
  }
  const status = (error as { statusCode?: number }).statusCode ?? 500;
  return errorResponse(
    status,
    (error as { code?: string }).code ?? fallback,
    error instanceof Error ? error.message : "Accounting Case request failed",
  );
}

export async function GET(request: Request, context: Ctx) {
  try {
    requireAccessToken(request);
    const { caseId } = await context.params;
    return successResponse(await enterpriseAccountingCaseService.get(caseId));
  } catch (error) {
    return routeError(error, "ACCOUNTING_CASE_GET_FAILED");
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor.role);
    const { caseId } = await context.params;
    const body = (await request.json()) as UpdateEnterpriseAccountingCaseInput;
    return successResponse(
      await enterpriseAccountingCaseService.update(caseId, body, actor.userId),
    );
  } catch (error) {
    return routeError(error, "ACCOUNTING_CASE_UPDATE_FAILED");
  }
}
