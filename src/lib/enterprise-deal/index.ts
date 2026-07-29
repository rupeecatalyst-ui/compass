/**
 * CO-ARCH-002 — Enterprise Deal client helpers (Waves 3–6).
 * Workspace consumers: use deal-data-access (DAL). Do not call storage or Deal API directly.
 * Wave 6: cutover health / reconciliation / rollback helpers — never auto-enable flags.
 */
export {
  dualWriteLoanFileToDeal,
  queueDealDualWriteAfterLocalSave,
} from "./dual-write";
export {
  mapLoanFileToDealCreateBody,
  mapLoanFileToDealUpdateBody,
  validateLoanFileForDealImport,
  loanFileDealSyncFingerprint,
} from "./map-loan-file-to-deal";
export { enterpriseDealApiClient } from "./deal-api-client";
export {
  listReconcileLog,
  clearReconcileLog,
  getDealIdMap,
  getRememberedDeal,
} from "./dual-write-store";
export {
  runMyDealsShadowRead,
  queueMyDealsShadowRead,
  listShadowMismatches,
  getLatestShadowMetrics,
  getModuleMigrationStatus,
  SHADOW_READ_MATERIAL_MISMATCH_RATE,
} from "./shadow-read";
export {
  listDealRegistryRowsLocal,
  loadMyDealsDealRegistryRows,
} from "./deal-registry-port";
export { mapEnterpriseDealToDealRegistryRow } from "./map-deal-to-registry-row";
export {
  loadDeals,
  loadDealsSync,
  getDealById,
  getDealByIdSync,
  listDealsForCustomerSync,
  createDeal,
  createDealAsync,
  updateDeal,
  updateDealAsync,
  saveDeals,
  appendDeal,
  subscribeDealsUpdated,
  updateDealTasks,
  updateDealTimeline,
  resolveDealsForOpportunityContext,
  clearEnterpriseDealReadCache,
  upsertEnterpriseDealCacheEntry,
  type DealCreateResult,
} from "./deal-data-access";
export {
  persistNewDealToEnterpriseRegistry,
  persistNewOpportunityToEnterpriseRegistry,
  attachEnterpriseDealIdentity,
  attachEnterpriseOpportunityIdentity,
  resolvePrimaryLenderRegistryId,
  DealCreatePersistenceError,
} from "./primary-write";
export {
  createDealFromOpportunity,
  buildDealCreateBodyFromOpportunity,
} from "./deal-create-from-opportunity";
export {
  loadDealPipelineRuntime,
  persistDealPipelineLenders,
  softDeleteRemovedPipelineDeals,
  removeLenderPipelineDeal,
  resolvePipelineDealId,
  identifyLenderAsEnterpriseDeal,
  dealToLenderExecution,
  toDealPipelineRuntime,
} from "./deal-pipeline-runtime";
export {
  lenderCaseStageToGrossStage,
  grossStageToLenderCaseStage,
  lenderCaseStageToPipelineStageProjection,
} from "./deal-lender-stage-map";
export {
  resolveDealStageProjection,
  assertDealStageAuthority,
} from "./deal-stage-projection";
export {
  aggregateOpportunityDealIntelligence,
  type OpportunityDealAggregation,
} from "./opportunity-deal-aggregation";
export {
  buildDealCutoverHealthSnapshot,
  type DealCutoverHealthSnapshot,
  type DealCutoverAlert,
} from "./cutover-health";
export {
  buildDealReconciliationReport,
  type DealReconciliationReport,
} from "./reconciliation-report";
export {
  runDealDalPerformanceBenchmark,
  type DealPerformanceBenchmark,
} from "./performance-benchmark";
export {
  buildDealIdleFlagEnvLines,
  buildDealEmergencyRollbackSteps,
  runClientDealRollbackDiagnosticsCleanup,
  formatRollbackRunbookMarkdown,
} from "./rollback-automation";
