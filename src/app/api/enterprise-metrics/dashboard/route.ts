/**
 * CO-PERF-001 — Public read of precomputed dashboard metrics (authenticated).
 * Heavy calculation happens in EME; this route only serves snapshots / live Category C.
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import {
  EME_DASHBOARD_METRIC_KEY,
  EME_KPI_STRIP_METRIC_KEY,
} from "@/constants/enterprise-metrics-engine";
import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "dashboard";

    if (view === "live") {
      const live = await enterpriseMetricsEngineService.getLiveMetrics();
      return successResponse(live);
    }

    if (view === "kpi_strip") {
      const snapshot = await enterpriseMetricsEngineService.getLatestSnapshot(
        EME_KPI_STRIP_METRIC_KEY,
        { periodKey: "today" },
      );
      const live = await enterpriseMetricsEngineService.getLiveMetrics();
      return successResponse({ snapshot, live });
    }

    const snapshot = await enterpriseMetricsEngineService.getLatestSnapshot(
      EME_DASHBOARD_METRIC_KEY,
      { periodKey: "latest" },
    );

    // Warm cache on miss — CO-ARCH-003 Tier 3: never block Tier 1 dashboard on full org derive.
    if (!snapshot) {
      void enterpriseMetricsEngineService
        .forceRecalculate({
          triggerSource: "dashboard_warmup",
          metricKeys: [EME_DASHBOARD_METRIC_KEY, EME_KPI_STRIP_METRIC_KEY],
        })
        .catch((err) => {
          console.warn("[CO-ARCH-003] EME dashboard warmup failed", err);
        });
      return successResponse({
        snapshot: null,
        warmed: false,
        warming: true,
        message:
          "Enterprise metrics snapshot is computing in the background. Refresh shortly or use Admin Force Recalculate.",
      });
    }

    return successResponse({ snapshot, warmed: false });
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      500,
      "EME_DASHBOARD_READ_FAILED",
      err instanceof Error ? err.message : "Failed to read EME dashboard metrics",
    );
  }
}
