/**
 * CO-ARCH-005 / CO-ARCH-007 / CO-MC-002 — Mission Control snapshot compose.
 * Heavy derive runs only inside EME (Night Mode / Admin Force) — never on MC page load.
 */

import { buildChanakyaRadarDashboard } from "@/lib/chanakya-radar/derive-dashboard";
import type { ChanakyaRadarDashboardModel } from "@/lib/chanakya-radar/derive-dashboard";
import { deriveBusinessHealthScore } from "@/lib/enterprise-business-intelligence/business-health";
import { deriveChanakyaExecutiveInsights } from "@/lib/enterprise-business-intelligence/chanakya-insights";
import { deriveExecutiveKpis } from "@/lib/enterprise-business-intelligence/executive-kpis";
import { deriveOperationalKpis } from "@/lib/enterprise-business-intelligence/operational-kpis";
import type { EbiDataContext } from "@/lib/enterprise-business-intelligence/snapshot";
import { deriveTeamPerformance } from "@/lib/enterprise-business-intelligence/team-performance";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { mapEnterpriseDealToLoanFileStub } from "@/lib/enterprise-deal/map-deal-to-loan-file";
import { deriveMissionControlEnterpriseIntelligence } from "@/lib/mission-control-enterprise-intelligence";
import type { LoanFile } from "@/types/catalyst-one";
import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import type { MissionControlEnterpriseIntelligencePack } from "@/types/mission-control-enterprise-intelligence";
import type { EteOperationalReport } from "@/types/enterprise-task-engine";

export type RadarSnapshotSummary = {
  dealCount: number;
  healthScore: number;
  direction: string;
  quadrantCounts: Record<string, number>;
};

export type ChanakyaRadarIntelligenceSnapshotPayload = {
  version: string;
  program: "CO-ARCH-005" | "CO-ARCH-007";
  asOf: string;
  generatedAt: string;
  dashboard: ChanakyaRadarDashboardModel;
  summary: RadarSnapshotSummary;
  sourceModules: string[];
};

export type MissionControlExecutiveSnapshotPayload = {
  version: string;
  program: "CO-ARCH-005" | "CO-MC-002";
  asOf: string;
  generatedAt: string;
  ebi: EbiSnapshot;
  /** @deprecated prefer radar.dashboard via EME radar key — kept for MC summary. */
  radarSummary: RadarSnapshotSummary;
  radar: ChanakyaRadarIntelligenceSnapshotPayload;
  /** CO-MC-002 — precomputed full-width executive intelligence sections. */
  intelligence?: MissionControlEnterpriseIntelligencePack;
  sourceModules: string[];
};

export type McComposeOpportunityLite = {
  id: string;
  lifecycleStatus?: string | null;
  sourceCode?: string | null;
  sourceWealthPartnerId?: string | null;
  sourceContactName?: string | null;
  participationRole?: string | null;
  productLabel?: string | null;
  productCode?: string | null;
  cityLabel?: string | null;
  stateLabel?: string | null;
  requestedAmount?: number | null;
  primaryContactName?: string | null;
  companyName?: string | null;
};

function emptyEteReport(asOf: string): EteOperationalReport {
  return {
    asOf,
    completedToday: 0,
    overdueOpen: 0,
    averageCompletionHours: null,
    byAssignee: [],
    byStage: [],
    byWorkType: [],
  };
}

function buildRadarSummary(radar: ChanakyaRadarDashboardModel): RadarSnapshotSummary {
  const quadrantCounts: Record<string, number> = {};
  for (const row of radar.rows) {
    const q = row.quadrant || "unknown";
    quadrantCounts[q] = (quadrantCounts[q] ?? 0) + 1;
  }
  return {
    dealCount: radar.rows.length,
    healthScore: radar.vector.healthScore,
    direction: String(radar.vector.direction),
    quadrantCounts,
  };
}

export function composeMissionControlExecutiveSnapshot(input: {
  deals: EnterpriseDealApiRecord[];
  opportunities?: McComposeOpportunityLite[];
  version?: string;
}): MissionControlExecutiveSnapshotPayload {
  const asOf = new Date().toISOString();
  const files: LoanFile[] = input.deals
    .map((d) => mapEnterpriseDealToLoanFileStub(d))
    .filter((f) => !f.archived);

  const radar = buildChanakyaRadarDashboard(files);
  const ctx: EbiDataContext = {
    asOf,
    files,
    radar,
    eteReport: emptyEteReport(asOf),
    tasks: [],
  };

  const executive = deriveExecutiveKpis(ctx);
  const operational = deriveOperationalKpis(ctx);
  const team = deriveTeamPerformance(ctx);
  const health = deriveBusinessHealthScore({ ctx, executive, operational, team });
  const insights = deriveChanakyaExecutiveInsights({
    executive,
    operational,
    team,
    health,
  });

  const ebi: EbiSnapshot = {
    asOf,
    executive,
    operational,
    team,
    health,
    insights,
  };

  const summary = buildRadarSummary(radar);
  const version = input.version ?? `mc-${asOf.slice(0, 10)}`;

  const radarPayload: ChanakyaRadarIntelligenceSnapshotPayload = {
    version: `radar-${asOf.slice(0, 10)}`,
    program: "CO-ARCH-007",
    asOf,
    generatedAt: asOf,
    dashboard: radar,
    summary,
    sourceModules: ["buildChanakyaRadarDashboard", "EnterpriseDeal"],
  };

  const intelligence = deriveMissionControlEnterpriseIntelligence({
    ebi,
    opportunities: input.opportunities ?? [],
    deals: input.deals.map((d) => {
      const row = d as EnterpriseDealApiRecord & {
        productCode?: string | null;
        expectedRevenue?: number | null;
        revenueReceived?: number | null;
        cityLabel?: string | null;
        stateLabel?: string | null;
        sourceCode?: string | null;
      };
      return {
        id: row.id,
        grossStage: row.grossStage,
        productLabel: row.productLabel,
        productCode: row.productCode,
        primaryCounterpartyName: row.primaryCounterpartyName,
        lenderId: row.lenderId,
        requestedAmount: row.requestedAmount ?? null,
        expectedRevenue: row.expectedRevenue ?? null,
        revenueReceived: row.revenueReceived ?? null,
        cityLabel: row.cityLabel,
        stateLabel: row.stateLabel,
        relationshipManagerName: row.relationshipManagerName,
        sourceCode: row.sourceCode,
      };
    }),
    asOf,
  });

  return {
    version,
    program: "CO-MC-002",
    asOf,
    generatedAt: asOf,
    ebi,
    radarSummary: summary,
    radar: radarPayload,
    intelligence,
    sourceModules: [
      "CO-MC-002",
      "buildChanakyaRadarDashboard",
      "deriveExecutiveKpis",
      "deriveBusinessHealthScore",
      "deriveMissionControlEnterpriseIntelligence",
      "EnterpriseDeal",
      "EnterpriseOpportunity",
    ],
  };
}
