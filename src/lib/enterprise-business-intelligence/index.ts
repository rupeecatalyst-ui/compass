/**
 * CO-BIZ-003 — Enterprise Business Intelligence (canonical analytics compose layer).
 * Read-only. Reuses Radar · ETE · Deal DAL. Never duplicates metric formulas.
 */

export { composeBusinessIntelligenceSnapshot } from "./compose";
export { loadEbiDataContext } from "./snapshot";
export { deriveExecutiveKpis } from "./executive-kpis";
export { deriveOperationalKpis } from "./operational-kpis";
export { deriveTeamPerformance } from "./team-performance";
export { deriveBusinessHealthScore } from "./business-health";
export { deriveChanakyaExecutiveInsights } from "./chanakya-insights";
export {
  createMissionControlBiProvider,
  createManagerBiProvider,
  createRelationshipManagerBiProvider,
  createBranchBiProvider,
  getEbiDashboard,
} from "./providers";
export { buildEbiReportCsv } from "./reports";
