/**
 * CO-ARCH-005 — Authenticated Mission Control Snapshot read (no heavy compute).
 */
import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import type { ApiResponse } from "@/types/api";
import {
  EME_MISSION_CONTROL_SNAPSHOT_KEY,
  EME_PERIOD_LATEST,
} from "@/constants/enterprise-metrics-engine";
import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";
import type { MissionControlExecutiveSnapshotPayload } from "@server/services/enterprise-metrics-engine/compose-mission-control-snapshot";

export async function GET(request: Request) {
  try {
    requireAccessToken(request);
    const snapshot = await enterpriseMetricsEngineService.getLatestSnapshot<
      MissionControlExecutiveSnapshotPayload
    >(EME_MISSION_CONTROL_SNAPSHOT_KEY, { periodKey: EME_PERIOD_LATEST });

    if (!snapshot) {
      return successResponse({
        snapshot: null,
        metadata: null,
        message:
          "Mission Control Snapshot is not available yet. An Administrator must run Force Recalculate or wait for the scheduled Enterprise Intelligence refresh.",
      });
    }

    return successResponse({
      snapshot: snapshot.payload,
      metadata: {
        asOf: snapshot.asOf,
        version: snapshot.payload?.version ?? null,
        category: snapshot.category,
        metricKey: snapshot.metricKey,
        score: snapshot.score,
        band: snapshot.band,
      },
    });
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
    }
    return errorResponse(
      500,
      "MC_SNAPSHOT_READ_FAILED",
      err instanceof Error ? err.message : "Failed to read Mission Control Snapshot",
    );
  }
}
