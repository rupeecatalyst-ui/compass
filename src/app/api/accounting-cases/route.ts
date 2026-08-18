import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { enterpriseAccountingCaseService } from "@server/services/enterprise-accounting-case/enterprise-accounting-case.service";

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const url = new URL(request.url);
    const result = await enterpriseAccountingCaseService.list({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      dealId: url.searchParams.get("dealId") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 25),
    });
    return successResponse(result);
  } catch (error) {
    const auth = error as { status?: number; body?: unknown };
    if (auth.status && auth.body) {
      return errorResponse(auth.status, "AUTH_ERROR", "Authentication required");
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    return errorResponse(
      status,
      (error as { code?: string }).code ?? "ACCOUNTING_CASE_LIST_FAILED",
      error instanceof Error ? error.message : "Failed to list Accounting Cases",
    );
  }
}
