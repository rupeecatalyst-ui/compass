/**
 * CO-OPS-002 — Operational Excellence & Observability (client-safe exports).
 * Server-only resolvers live in resolve-ops-health.ts (import via API routes).
 */

export { OPS_CORRELATION_HEADER, createCorrelationId, resolveCorrelationId } from "./correlation";
export { redactUnknown, redactString, toAuditScalar } from "./redact";
export { logOps } from "./structured-log";
export {
  recordBusinessAudit,
  recordOpsError,
  recordApiTiming,
} from "./record";
export {
  listAudits,
  listErrors,
  listPerf,
  estimateActiveUsers,
  touchUser,
} from "./rings";
export { deriveOpsAlerts, summarizeOpsHealth } from "./alert-rules";
