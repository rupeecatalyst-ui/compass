/**
 * CO-BIZ-003 — Compose full BI snapshot (canonical analytics entry).
 */

import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import { deriveBusinessHealthScore } from "./business-health";
import { deriveChanakyaExecutiveInsights } from "./chanakya-insights";
import { deriveExecutiveKpis } from "./executive-kpis";
import { deriveOperationalKpis } from "./operational-kpis";
import { loadEbiDataContext } from "./snapshot";
import { deriveTeamPerformance } from "./team-performance";

export function composeBusinessIntelligenceSnapshot(): EbiSnapshot {
  const ctx = loadEbiDataContext();
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
  return {
    asOf: ctx.asOf,
    executive,
    operational,
    team,
    health,
    insights,
  };
}
