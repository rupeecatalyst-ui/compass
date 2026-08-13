/**
 * CO-MARKETING-MKT-10 — Admin Marketing Analytics API.
 * Derives from execution ledger + engagement events. No audience-row mirror. No live send.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import { marketingAnalyticsService } from "@server/services/enterprise-marketing-engine/analytics.service";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Marketing analytics"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  const statusCode = (err as { statusCode?: number }).statusCode;
  const code = (err as { code?: string }).code;
  if (statusCode === 401 || statusCode === 403) {
    return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
  }
  return errorResponse(
    statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    code ?? "MARKETING_ANALYTICS_FAILED",
    err instanceof Error ? err.message : "Marketing analytics request failed",
  );
}

const actorCtx = (actor: { userId: string; role: string }) => ({
  userId: actor.userId,
  role: actor.role,
  organizationId: "default" as string | null,
});

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "dashboard";
    const preset = url.searchParams.get("preset");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const campaignId = url.searchParams.get("campaignId");
    const channel = url.searchParams.get("channel");
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10);
    const ctx = actorCtx(actor);

    if (view === "engagement") {
      const result = marketingAnalyticsService.listEngagement(ctx, {
        preset,
        from,
        to,
        campaignId,
        channel,
        type,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 50,
      });
      return successResponse(result);
    }

    if (view === "execution") {
      if (!campaignId?.trim()) {
        return errorResponse(400, "CAMPAIGN_REQUIRED", "campaignId is required for execution drill-down");
      }
      const result = marketingAnalyticsService.listExecutionDrilldown(ctx, {
        preset,
        from,
        to,
        campaignId,
        status,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 50,
      });
      return successResponse(result);
    }

    const dashboard = await marketingAnalyticsService.getDashboard(ctx, {
      preset,
      from,
      to,
      campaignId,
      channel,
    });
    return successResponse(dashboard);
  } catch (err) {
    return fromUnknown(err);
  }
}
