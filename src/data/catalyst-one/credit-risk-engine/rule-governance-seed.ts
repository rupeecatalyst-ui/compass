import type { RuleLibraryVersion, RuleOwnerId, RuleReviewCycleId, RuleSeverity } from "@/types/rule-library";

/** Shared governance defaults for seed rules — admin-editable in future sprints. */
export function defaultRuleGovernance(overrides: {
  businessImpact: string;
  affectedSystems: string[];
  ruleOwnerId: RuleOwnerId;
  reviewCycleId?: RuleReviewCycleId;
  nextReviewDate: string;
  lastReviewedOn?: string;
  lastReviewedBy?: string;
  businessJustification?: string;
  approvalAuthority?: string;
}): Pick<
  RuleLibraryVersion,
  | "businessImpact"
  | "affectedSystems"
  | "nextReviewDate"
  | "ruleOwnerId"
  | "reviewCycleId"
  | "lastReviewedOn"
  | "lastReviewedBy"
  | "businessJustification"
  | "approvalAuthority"
> {
  return {
    businessImpact: overrides.businessImpact,
    affectedSystems: overrides.affectedSystems,
    ruleOwnerId: overrides.ruleOwnerId,
    reviewCycleId: overrides.reviewCycleId ?? "quarterly",
    nextReviewDate: overrides.nextReviewDate,
    lastReviewedOn: overrides.lastReviewedOn,
    lastReviewedBy: overrides.lastReviewedBy,
    businessJustification: overrides.businessJustification ?? "",
    approvalAuthority: overrides.approvalAuthority ?? "Chief Risk Officer",
  };
}

/** Default severity by rule code — seed helper. */
export const SEED_RULE_SEVERITIES: Record<string, RuleSeverity> = {
  FIN_FOIR_MAX: "high",
  PROP_LTV_MAX: "high",
  BUR_CIBIL_MIN: "critical",
  BANK_ABB_MIN: "high",
  GEO_METRO_ONLY: "medium",
  SCR_FIN_HEALTH: "medium",
  FIN_DBR_MAX: "high",
  BANK_HEALTH_MIN: "medium",
};
