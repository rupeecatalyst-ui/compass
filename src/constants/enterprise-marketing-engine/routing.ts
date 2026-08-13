/**
 * CO-MARKETING-MKT-12 — Closed routing criteria (not a general-purpose rules engine).
 */

export const MARKETING_ROUTING_MODES = [
  "SINGLE_USER",
  "TEAM",
  "ROUND_ROBIN",
  "USER_POOL",
  "RULE_BASED",
] as const;

export const MARKETING_ROUTING_CRITERION_FIELDS = [
  "product",
  "customerCategory",
  "geography",
  "campaign",
  "source",
  "partner",
  "team",
] as const;

export type MarketingRoutingCriterionField =
  (typeof MARKETING_ROUTING_CRITERION_FIELDS)[number];

export const MARKETING_ROUTING_CRITERION_LABELS: Record<
  MarketingRoutingCriterionField,
  string
> = {
  product: "Product",
  customerCategory: "Customer category",
  geography: "Geography",
  campaign: "Campaign",
  source: "Source",
  partner: "Partner",
  team: "Team",
};
