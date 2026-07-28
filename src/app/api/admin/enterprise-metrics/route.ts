/**
 * CO-PERF-001 — Admin Enterprise Metrics Engine APIs.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import type { EmeEventKey } from "@/types/enterprise-metrics-engine";
import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Enterprise Metrics"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "status";

    if (view === "live") {
      const live = await enterpriseMetricsEngineService.getLiveMetrics();
      return successResponse(live);
    }

    if (view === "snapshot") {
      const metricKey = url.searchParams.get("metricKey") ?? "dashboard.visual_analytics";
      const snapshot = await enterpriseMetricsEngineService.getLatestSnapshot(metricKey, {
        periodKey: url.searchParams.get("periodKey") ?? undefined,
        entityId: url.searchParams.get("entityId"),
      });
      return successResponse({ snapshot });
    }

    const status = await enterpriseMetricsEngineService.getAdminStatus();
    return successResponse(status);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      statusCode === 403 ? 403 : 500,
      "EME_STATUS_FAILED",
      err instanceof Error ? err.message : "Failed to load Enterprise Metrics status",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      dryRun?: boolean;
      eventKey?: EmeEventKey;
      intervalId?: string;
      enabled?: boolean;
      hourLocal?: number;
    };
    const action = body.action ?? "force_recalculate";
    const dryRun = Boolean(body.dryRun);

    if (action === "set_mission_control_schedule") {
      if (!body.intervalId) {
        return errorResponse(400, "INVALID_SCHEDULE", "intervalId is required");
      }
      const schedule = await enterpriseMetricsEngineService.setMissionControlSchedule({
        intervalId: body.intervalId,
        enabled: body.enabled,
        actorUserId: actor.userId,
      });
      return successResponse({ schedule });
    }

    if (action === "set_chanakya_night_schedule") {
      const hourLocal =
        typeof body.hourLocal === "number" ? body.hourLocal : Number(body.hourLocal);
      if (!Number.isFinite(hourLocal)) {
        return errorResponse(400, "INVALID_NIGHT_HOUR", "hourLocal (0–23) is required");
      }
      const schedule = await enterpriseMetricsEngineService.setChanakyaNightSchedule({
        hourLocal,
        enabled: body.enabled,
        actorUserId: actor.userId,
      });
      return successResponse({ schedule });
    }

    if (action === "dry_run") {
      const result = await enterpriseMetricsEngineService.forceRecalculate({
        dryRun: true,
        triggerSource: "admin",
        actorUserId: actor.userId,
      });
      return successResponse(result);
    }

    if (action === "event_refresh" && body.eventKey) {
      const result = await enterpriseMetricsEngineService.refreshForEvent(body.eventKey, {
        dryRun,
        triggerSource: "admin",
        actorUserId: actor.userId,
      });
      return successResponse(result);
    }

    if (action === "nightly_snapshot") {
      const result = await enterpriseMetricsEngineService.runNightlySnapshot({
        dryRun,
        triggerSource: "admin",
        actorUserId: actor.userId,
      });
      return successResponse(result);
    }

    const result = await enterpriseMetricsEngineService.forceRecalculate({
      dryRun,
      triggerSource: "admin",
      actorUserId: actor.userId,
    });
    return successResponse(result);
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 401 || statusCode === 403) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      500,
      "EME_COMPUTE_FAILED",
      err instanceof Error ? err.message : "Enterprise Metrics compute failed",
    );
  }
}
