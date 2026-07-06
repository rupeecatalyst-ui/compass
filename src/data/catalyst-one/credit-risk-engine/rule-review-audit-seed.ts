import type { RuleReviewAuditEntry } from "@/types/rule-library";

export const DEFAULT_RULE_REVIEW_AUDIT: RuleReviewAuditEntry[] = [
  {
    id: "rev_audit_001",
    ruleId: "rule_001",
    ruleCode: "FIN_FOIR_MAX",
    ruleName: "Maximum FOIR Threshold",
    reviewedBy: "Chief Risk Officer",
    reviewedOn: "2026-06-20T10:30:00Z",
    comments: "Reviewed against latest RBI guidance and partner lender caps. No changes required.",
    nextReviewDate: "2026-09-01",
  },
];

