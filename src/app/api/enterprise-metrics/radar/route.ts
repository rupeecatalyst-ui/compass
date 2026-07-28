/**

 * CO-ARCH-007 — Authenticated CHANAKYA Radar Snapshot read (Tier 4 — no heavy compute).

 */

import {

  errorResponse,

  fromAuthError,

  requireAccessToken,

  successResponse,

} from "@/lib/api/auth-route-utils";

import type { ApiResponse } from "@/types/api";

import {

  EME_MISSION_CONTROL_RADAR_KEY,

  EME_PERIOD_LATEST,

} from "@/constants/enterprise-metrics-engine";

import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";

import type { ChanakyaRadarIntelligenceSnapshotPayload } from "@server/services/enterprise-metrics-engine/compose-mission-control-snapshot";



export async function GET(request: Request) {

  try {

    requireAccessToken(request);

    const [snapshot, night] = await Promise.all([

      enterpriseMetricsEngineService.getLatestSnapshot<ChanakyaRadarIntelligenceSnapshotPayload>(

        EME_MISSION_CONTROL_RADAR_KEY,

        { periodKey: EME_PERIOD_LATEST },

      ),

      enterpriseMetricsEngineService.getChanakyaNightSchedule(),

    ]);



    if (!snapshot?.payload?.dashboard) {

      return successResponse({

        snapshot: null,

        metadata: null,

        message:

          "CHANAKYA Radar Snapshot is not available yet. An Administrator must run Force Recalculate or wait for Night Mode intelligence refresh.",

      });

    }



    const next = (() => {

      const base = snapshot.asOf ? new Date(snapshot.asOf) : new Date();

      const n = new Date(base);

      n.setHours(night.hourLocal, 0, 0, 0);

      if (n.getTime() <= Date.now()) n.setDate(n.getDate() + 1);

      return n.toISOString();

    })();



    return successResponse({

      snapshot: snapshot.payload,

      metadata: {

        asOf: snapshot.asOf,

        version: snapshot.payload.version ?? null,

        nextScheduledRefresh: next,

        nightHourLocal: night.hourLocal,

        category: snapshot.category,

        metricKey: snapshot.metricKey,

      },

    });

  } catch (err) {

    if ((err as { status?: number }).status === 401) {

      return fromAuthError(err as { status: number; body: ApiResponse<unknown> });

    }

    return errorResponse(

      500,

      "RADAR_SNAPSHOT_READ_FAILED",

      err instanceof Error ? err.message : "Failed to read CHANAKYA Radar Snapshot",

    );

  }

}


