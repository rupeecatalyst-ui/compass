/**
 * CO-MARKETING-MKT-10 — Admin Marketing Analytics API.
 * Derives from execution ledger + engagement events. No audience-row mirror. No live send.
 */

import {
  errorResponse,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingAnalyticsService } from "@server/services/enterprise-marketing-engine/analytics.service";
import { marketingMonitoringService } from "@server/services/enterprise-marketing-engine/monitoring.service";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Marketing analytics"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  return fromMarketingUnknownError(
    err,
    "MARKETING_ANALYTICS_FAILED",
    err instanceof Error ? err.message : "Marketing analytics request failed",
  );
}

async function actorCtx(actor: { userId: string; role: string }) {
  return {
    userId: actor.userId,
    role: actor.role,
    organizationId: await resolveMarketingOrganizationId(),
  };
}

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
    const ctx = await actorCtx(actor);
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.ANALYTICS_VIEW);

    if (view === "monitoring") {
      const dashboard = await marketingMonitoringService.getDashboard(ctx, { campaignId });
      return successResponse(dashboard);
    }

    if (view === "recipients") {
      const result = await marketingMonitoringService.listRecipients(ctx, {
        campaignId,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 50,
      });
      return successResponse(result);
    }

    if (view === "engagement") {
      const result = await marketingAnalyticsService.listEngagement(ctx, {
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
      const result = await marketingAnalyticsService.listExecutionDrilldown(ctx, {
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
