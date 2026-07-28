/**
 * CO-LEND-001 — Admin approval queue list.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { lenderProgramPortalService } from "@server/services/lender-program-portal/lender-program-portal.service";

export async function GET(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma mode");
    }
    requireAccessToken(request);
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    const items = await lenderProgramPortalService.listSubmissions(status || undefined);
    return successResponse({ items });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401) return fromAuthError(err as never);
    return errorResponse(
      e.statusCode || 500,
      e.code || "LENDER_PROGRAM_PORTAL_ERROR",
      e.message || "Failed to list submissions",
    );
  }
}
