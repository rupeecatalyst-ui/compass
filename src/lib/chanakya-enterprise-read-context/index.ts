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
} from "./transaction-attention";
export {
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
  CHANAKYA_CONTACT_PII_REDACTION_MARKER,
} from "./redact-pii";
export {
  recordChanakyaEnterpriseReadAudit,
  listChanakyaEnterpriseReadAudit,
  resetChanakyaEnterpriseReadAuditForTests,
} from "./audit";
export { fieldAvailable, fieldMissing, displayOrMarker } from "./field";
