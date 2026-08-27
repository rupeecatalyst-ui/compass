/**
 * CO-REFINEMENT-004 — Shared certified Mission Control snapshot loader.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import { MISSION_CONTROL_ANALYTICS_REFRESH_LABEL } from "@/constants/mission-control-enterprise-intelligence";
import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import type { MissionControlEnterpriseIntelligencePack } from "@/types/mission-control-enterprise-intelligence";

export type MissionControlCertifiedSnapshot = {
  ebi: EbiSnapshot;
  intelligence: MissionControlEnterpriseIntelligencePack | null;
  meta: {
    asOf: string;
    version: string | null;
    source: "certified_snapshot" | "awaiting_snapshot";
    refreshScheduleLabel: string;
  };
};

export async function loadMissionControlCertifiedSnapshot(): Promise<MissionControlCertifiedSnapshot | null> {
  try {
    const res = await authenticatedJsonFetch("/api/enterprise-metrics/mission-control");
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: {
        snapshot?: {
          ebi?: EbiSnapshot;
          version?: string;
          asOf?: string;
          intelligence?: MissionControlEnterpriseIntelligencePack;
        } | null;
        metadata?: { asOf?: string; version?: string | null } | null;
      };
    };
    const ebi = body.data?.snapshot?.ebi;
    if (!ebi?.health) return null;
    return {
      ebi,
      intelligence: body.data?.snapshot?.intelligence ?? null,
      meta: {
        asOf: body.data?.metadata?.asOf || ebi.asOf,
        version: body.data?.metadata?.version ?? body.data?.snapshot?.version ?? null,
        source: "certified_snapshot",
        refreshScheduleLabel: MISSION_CONTROL_ANALYTICS_REFRESH_LABEL,
      },
    };
  } catch {
    return null;
  }
}
