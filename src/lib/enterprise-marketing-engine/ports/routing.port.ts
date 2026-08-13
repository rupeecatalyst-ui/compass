/**
 * CO-MARKETING-MKT-01 — Response Routing Port (contract only).
 * Initial assignee only — Opportunity ownership remains authoritative after handoff.
 */

export type MarketingRoutingMode =
  | "SINGLE_USER"
  | "TEAM"
  | "ROUND_ROBIN"
  | "USER_POOL"
  | "RULE_BASED";

export type MarketingRouteAssignmentRequest = {
  organizationId: string;
  campaignId: string;
  qualificationId: string;
  routingPolicyId: string;
};

export type MarketingRoutingPort = {
  assign(
    request: MarketingRouteAssignmentRequest,
  ): Promise<{ assigneeUserId: string; mode: MarketingRoutingMode; idempotent: boolean }>;
};
