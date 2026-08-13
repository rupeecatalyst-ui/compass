/**
 * CO-MARKETING-MKT-01 — Admin Marketing foundation API (status only).
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { enterpriseMarketingFoundationService } from "@server/services/enterprise-marketing-engine";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can access Marketing Command Center"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const status = enterpriseMarketingFoundationService.getStatus({
      userId: actor.userId,
      organizationId: null,
    });
    return successResponse(status);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      500,
      "MARKETING_STATUS_FAILED",
      err instanceof Error ? err.message : "Failed to load Marketing foundation status",
    );
  }
}

/** Mutations that would send, import, or hand off are refused at the foundation boundary. */
export async function POST() {
  return errorResponse(
    403,
    "EME_SAFETY_BLOCKED",
    "Marketing mutations are disabled in CO-MARKETING-MKT-01. Execution, import, and handoff remain off.",
  );
}
