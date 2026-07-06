import { DEFAULT_RULE_SEVERITY_AUDIT } from "@/data/catalyst-one/credit-risk-engine/rule-severity-audit-seed";
import type { RuleSeverity, RuleSeverityAuditEntry } from "@/types/rule-library";

let severityAuditOverride: RuleSeverityAuditEntry[] | null = null;

export function setRuleSeverityAuditTrail(entries: RuleSeverityAuditEntry[]): void {
  severityAuditOverride = entries;
}

export function getRuleSeverityAuditTrail(): RuleSeverityAuditEntry[] {
  return severityAuditOverride ?? DEFAULT_RULE_SEVERITY_AUDIT;
}

export function getSeverityAuditForRule(ruleId: string): RuleSeverityAuditEntry[] {
  return getRuleSeverityAuditTrail()
    .filter((e) => e.ruleId === ruleId)
    .sort((a, b) => b.changedOn.localeCompare(a.changedOn));
}

/** Append-only — severity changes must be fully audited. */
export function appendRuleSeverityAuditEntry(
  entry: Omit<RuleSeverityAuditEntry, "id" | "changedOn"> & { changedOn?: string },
): RuleSeverityAuditEntry {
  const record: RuleSeverityAuditEntry = {
    ...entry,
    id: `sev_audit_${Date.now()}`,
    changedOn: entry.changedOn ?? new Date().toISOString(),
  };
  severityAuditOverride = [record, ...(severityAuditOverride ?? DEFAULT_RULE_SEVERITY_AUDIT)];
  return record;
}

export function recordSeverityChangeIfNeeded(params: {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  oldSeverity: RuleSeverity | null | undefined;
  newSeverity: RuleSeverity;
  changedBy: string;
  reason?: string;
}): RuleSeverityAuditEntry | null {
  if (params.oldSeverity === params.newSeverity) return null;
  return appendRuleSeverityAuditEntry({
    ruleId: params.ruleId,
    ruleCode: params.ruleCode,
    ruleName: params.ruleName,
    oldSeverity: params.oldSeverity ?? null,
    newSeverity: params.newSeverity,
    changedBy: params.changedBy,
    reason: params.reason,
  });
}
