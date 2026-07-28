/**

 * CO-PERF-001 / CO-ARCH-005 — Enterprise Metrics cron.

 * Runs at most every 2 hours (vercel.json); skips when Mission Control schedule is not due.

 */

import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";

import { enterpriseMetricsEngineService } from "@server/services/enterprise-metrics-engine";



export async function POST(request: Request) {

  const secret = process.env.CRON_SECRET?.trim();

  if (secret) {

    const auth = request.headers.get("authorization") || "";

    if (auth !== `Bearer ${secret}`) {

      return errorResponse(401, "UNAUTHORIZED", "Invalid cron secret");

    }

  } else if (process.env.NODE_ENV === "production") {

    return errorResponse(

      503,

      "CRON_NOT_CONFIGURED",

      "Set CRON_SECRET to enable Enterprise Metrics cron.",

    );

  }



  try {

    const due = await enterpriseMetricsEngineService.isMissionControlRefreshDue();

    if (!due.due) {

      return successResponse({

        skipped: true,

        reason: due.reason,

        intervalId: due.intervalId,

        lastSnapshotAt: due.lastSnapshotAt,

        message:

          "Mission Control Snapshot schedule not due — skipped heavy analytics to protect operational workloads.",

      });

    }



    const result = await enterpriseMetricsEngineService.runNightlySnapshot({

      triggerSource: "cron",

    });

    return successResponse({

      skipped: false,

      dueReason: due.reason,

      intervalId: due.intervalId,

      ...result,

    });

  } catch (err) {

    return errorResponse(

      500,

      "EME_CRON_FAILED",

      err instanceof Error ? err.message : "Nightly metrics run failed",

    );

  }

}



export async function GET(request: Request) {

  return POST(request);

}


