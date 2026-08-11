/**
 * CO-AI-G2-W8 — Product Owner Shadow Mode Dashboard API.
 * Internal administrators only — never customer-accessible.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import {
  buildEaoShadowDashboardSnapshot,
  EAO_SHADOW_DASHBOARD_FIXTURES,
} from "@/lib/enterprise-ai-orchestrator/shadow-dashboard";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(
      new Error("Only administrators can access the Shadow Mode Dashboard"),
      {
        statusCode: 403,
        code: "FORBIDDEN",
      },
    );
  }
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);

    const snapshot = buildEaoShadowDashboardSnapshot({
      title: "Shadow Mode Dashboard — Product Owner Review",
      rows: EAO_SHADOW_DASHBOARD_FIXTURES,
    });

    return successResponse(snapshot);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      statusCode === 403 ? 403 : 500,
      "SHADOW_DASHBOARD_FAILED",
      err instanceof Error ? err.message : "Failed to load Shadow Mode Dashboard",
    );
  }
}
