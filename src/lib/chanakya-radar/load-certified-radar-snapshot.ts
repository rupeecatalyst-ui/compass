/**

 * CO-ARCH-007 — Tier 4 client loader for certified CHANAKYA Radar Snapshot.

 */



import { authenticatedJsonFetch } from "@/lib/api-client";

import type { ChanakyaRadarDashboardModel } from "@/lib/chanakya-radar/derive-dashboard";



export type CertifiedRadarSnapshotMeta = {

  asOf: string;

  version: string | null;

  nextScheduledRefresh: string | null;

  nightHourLocal: number;

  source: "certified_snapshot" | "awaiting_snapshot";

};



export type CertifiedRadarSnapshot = {

  dashboard: ChanakyaRadarDashboardModel | null;

  meta: CertifiedRadarSnapshotMeta;

};



export async function loadCertifiedRadarSnapshot(): Promise<CertifiedRadarSnapshot> {

  try {

    const res = await authenticatedJsonFetch("/api/enterprise-metrics/radar");

    if (!res.ok) {

      return {

        dashboard: null,

        meta: {

          asOf: new Date().toISOString(),

          version: null,

          nextScheduledRefresh: null,

          nightHourLocal: 2,

          source: "awaiting_snapshot",

        },

      };

    }

    const body = (await res.json()) as {

      success?: boolean;

      data?: {

        snapshot?: {

          dashboard?: ChanakyaRadarDashboardModel;

          version?: string;

          asOf?: string;

        } | null;

        metadata?: {

          asOf?: string;

          version?: string | null;

          nextScheduledRefresh?: string | null;

          nightHourLocal?: number;

        } | null;

      };

    };

    const dashboard = body.data?.snapshot?.dashboard ?? null;

    if (!dashboard) {

      return {

        dashboard: null,

        meta: {

          asOf: new Date().toISOString(),

          version: null,

          nextScheduledRefresh: body.data?.metadata?.nextScheduledRefresh ?? null,

          nightHourLocal: body.data?.metadata?.nightHourLocal ?? 2,

          source: "awaiting_snapshot",

        },

      };

    }

    return {

      dashboard,

      meta: {

        asOf: body.data?.metadata?.asOf || body.data?.snapshot?.asOf || new Date().toISOString(),

        version: body.data?.metadata?.version ?? body.data?.snapshot?.version ?? null,

        nextScheduledRefresh: body.data?.metadata?.nextScheduledRefresh ?? null,

        nightHourLocal: body.data?.metadata?.nightHourLocal ?? 2,

        source: "certified_snapshot",

      },

    };

  } catch {

    return {

      dashboard: null,

      meta: {

        asOf: new Date().toISOString(),

        version: null,

        nextScheduledRefresh: null,

        nightHourLocal: 2,

        source: "awaiting_snapshot",

      },

    };

  }

}


