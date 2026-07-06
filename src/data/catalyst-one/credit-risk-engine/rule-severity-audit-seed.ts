import type { RuleSeverityAuditEntry } from "@/types/rule-library";

export const DEFAULT_RULE_SEVERITY_AUDIT: RuleSeverityAuditEntry[] = [
  {
    id: "sev_audit_001",
    ruleId: "rule_001",
    ruleCode: "FIN_FOIR_MAX",
    ruleName: "Maximum FOIR Threshold",
    oldSeverity: "medium",
    newSeverity: "high",
    changedBy: "Chief Risk Officer",
    changedOn: "2025-12-15T10:00:00Z",
    reason: "Aligned with lender credit policy — FOIR breach blocks sanction.",
  },
  {
    id: "sev_audit_002",
    ruleId: "rule_003",
    ruleCode: "BUR_CIBIL_MIN",
    ruleName: "Minimum Bureau Score",
    oldSeverity: "high",
    newSeverity: "critical",
    changedBy: "Risk Committee",
    changedOn: "2025-05-20T09:00:00Z",
    reason: "Bureau score is mandatory gate for all credit products.",
  },
];
