import { DEFAULT_RULE_REVIEW_AUDIT } from "@/data/catalyst-one/credit-risk-engine/rule-review-audit-seed";
import type { RuleReviewAuditEntry } from "@/types/rule-library";

let reviewAuditOverride: RuleReviewAuditEntry[] | null = null;

export function setRuleReviewAuditTrail(entries: RuleReviewAuditEntry[]): void {
  reviewAuditOverride = entries;
}

export function getRuleReviewAuditTrail(): RuleReviewAuditEntry[] {
  return reviewAuditOverride ?? DEFAULT_RULE_REVIEW_AUDIT;
}

export function appendRuleReviewAuditEntry(entry: RuleReviewAuditEntry): void {
  reviewAuditOverride = [entry, ...getRuleReviewAuditTrail()];
}

export function getReviewAuditForRule(ruleId: string): RuleReviewAuditEntry[] {
  return getRuleReviewAuditTrail()
    .filter((e) => e.ruleId === ruleId)
    .sort((a, b) => new Date(b.reviewedOn).getTime() - new Date(a.reviewedOn).getTime());
}

