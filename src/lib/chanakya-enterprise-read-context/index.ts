/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — public lib surface.
 */

export {
  compileChanakyaEnterpriseReadContext,
} from "./compile";
export {
  assembleChanakyaOpportunity360,
  buildEnterpriseAttentionSummary,
} from "./opportunity-360";
export { assembleChanakyaDeal360 } from "./deal-360";
export {
  buildTransactionAttentionContext,
  buildCommercialAttentionContext,
  buildEntityAttentionExplanation,
  buildAttentionReasonsFromRadarRow,
  mapRadarRowToAttentionEvidence,
  attentionExplanationStatus,
} from "./transaction-attention";
export {
  projectCommercialAccountingContext,
  projectPortfolioCommercialSnapshot,
  appendCommercialAttentionReasons,
} from "./commercial-projections";
export {
  projectEarEvidence,
  projectDialogueEvidence,
  projectDocumentReadinessEvidence,
  projectPhaseReadinessEvidence,
  projectPostDisbursementConfirmationEvidence,
} from "./evidence-projections";
export {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
  redactContactValuesInText,
  textContainsCustomerContactPii,
  CHANAKYA_CONTACT_PII_REDACTION_MARKER,
} from "./redact-pii";
export {
  projectChangeIntelligence,
  resolveChangePeriodBounds,
  mapEarEventToChangeRecord,
  mapAccountingEvidenceToChangeRecords,
  assembleChangeIntelligenceContext,
} from "./change-intelligence";
export {
  projectProductLenderIntelligence,
  assembleProductLenderIntelligence,
  buildProductContextEvidence,
  buildAssignedLenderAssessments,
  buildMatrixMappedLenders,
  buildPotentialLenderFitAssessments,
  buildInternalLenderFitRecommendations,
  assertNoForbiddenLenderFitLanguage,
} from "./product-lender-intelligence";
export {
  mapEarEventToChangeRecord as mapEarEventToChangeRecordCore,
  mapEteTaskToChangeRecords,
  mapSdeExceptionToChangeRecords,
  resolveChangePeriodBounds as resolveChangePeriodBoundsCore,
  assembleChangeIntelligenceContext as assembleChangeIntelligenceContextCore,
  isTimestampInPeriod,
  buildHumanReadableChangeSummary,
} from "./change-intelligence-core";
export {
  recordChanakyaEnterpriseReadAudit,
  listChanakyaEnterpriseReadAudit,
  resetChanakyaEnterpriseReadAuditForTests,
} from "./audit";
export { fieldAvailable, fieldMissing, displayOrMarker } from "./field";
export {
  composeTransactionExecutiveSnapshot,
  composeTransactionExecutiveSnapshotFromCompile,
  assertNoPiiInExecutiveText,
} from "./transaction-executive-snapshot";
export {
  composeTransactionExecutiveSnapshot as composeTransactionExecutiveSnapshotCore,
  assertNoPiiInExecutiveText as assertNoPiiInExecutiveTextCore,
} from "./transaction-executive-snapshot-core";
