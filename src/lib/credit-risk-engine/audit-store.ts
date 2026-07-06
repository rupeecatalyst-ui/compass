import { DEFAULT_CREDIT_RISK_AUDIT_TRAIL } from "@/data/catalyst-one/credit-risk-engine/audit-seed";
import type { CreditRiskAuditEntry } from "@/types/credit-risk-engine";

let auditTrailOverride: CreditRiskAuditEntry[] | null = null;

export function setCreditRiskAuditTrail(entries: CreditRiskAuditEntry[]): void {
  auditTrailOverride = entries;
}

export function getCreditRiskAuditTrail(): CreditRiskAuditEntry[] {
  return auditTrailOverride ?? DEFAULT_CREDIT_RISK_AUDIT_TRAIL;
}

/** Append-only audit architecture — persistence wired in a future sprint. */
export function appendCreditRiskAuditEntry(
  entry: Omit<CreditRiskAuditEntry, "id" | "timestamp"> & { timestamp?: string },
): CreditRiskAuditEntry {
  const record: CreditRiskAuditEntry = {
    ...entry,
    id: `audit_${Date.now()}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  const current = getCreditRiskAuditTrail();
  auditTrailOverride = [record, ...current];
  return record;
}

export function getAuditTrailForPolicy(policyId: string): CreditRiskAuditEntry[] {
  return getCreditRiskAuditTrail().filter((e) => e.policyId === policyId);
}
