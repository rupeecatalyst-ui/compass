/**
 * CO-MARKETING-MKT-12 — Closed-set assignee pick (no general rules engine).
 * Criteria: product · customer category · geography · campaign · source · partner · team.
 */

import { MARKETING_ROUTING_CRITERION_FIELDS } from "@/constants/enterprise-marketing-engine/routing";
import type { MarketingRoutingMode } from "@/lib/enterprise-marketing-engine/ports/routing.port";
import type {
  MarketingRoutingContext,
  MarketingRoutingMember,
  MarketingRoutingPolicy,
  MarketingRoutingRule,
} from "@/types/enterprise-marketing-qualification";

export type MarketingAssigneePick = {
  userId: string;
  mode: MarketingRoutingMode;
  matchedRuleId?: string | null;
  nextCursor?: number;
};

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function routingUnconfigured(message: string): never {
  throw Object.assign(new Error(message), {
    statusCode: 400,
    code: "ROUTING_UNCONFIGURED",
  });
}

function contextValue(
  context: MarketingRoutingContext,
  field: MarketingRoutingRule["field"],
): string {
  switch (field) {
    case "product":
      return norm(context.product);
    case "customerCategory":
      return norm(context.customerCategory);
    case "geography":
      return norm(context.geography);
    case "campaign":
      return norm(context.campaign);
    case "source":
      return norm(context.source);
    case "partner":
      return norm(context.partner);
    case "team":
      return norm(context.team);
    default:
      return "";
  }
}

function membersForTeam(
  members: MarketingRoutingMember[],
  teamId: string | null | undefined,
): MarketingRoutingMember[] {
  const needle = norm(teamId);
  if (!needle) return members;
  return members.filter((m) => norm(m.teamId) === needle);
}

function roundRobinPick(
  members: MarketingRoutingMember[],
  cursor: number,
): { member: MarketingRoutingMember; nextCursor: number } {
  if (members.length === 0) {
    routingUnconfigured("Routing pool has no members");
  }
  const idx = ((cursor % members.length) + members.length) % members.length;
  return { member: members[idx]!, nextCursor: idx + 1 };
}

function matchClosedRule(
  rules: MarketingRoutingRule[],
  context: MarketingRoutingContext,
): MarketingRoutingRule | null {
  for (const rule of rules) {
    if (!MARKETING_ROUTING_CRITERION_FIELDS.includes(rule.field)) continue;
    const left = contextValue(context, rule.field);
    const right = norm(rule.equals);
    if (left && right && left === right) return rule;
  }
  return null;
}

export function assembleMarketingRoutingContext(input: {
  campaignId: string;
  product?: string | null;
  customerCategory?: string | null;
  city?: string | null;
  territory?: string | null;
  source?: string | null;
  partnerId?: string | null;
  teamId?: string | null;
}): MarketingRoutingContext {
  return {
    product: input.product ?? null,
    customerCategory: input.customerCategory ?? null,
    geography: input.territory || input.city || null,
    campaign: input.campaignId,
    source: input.source ?? null,
    partner: input.partnerId ?? null,
    team: input.teamId ?? null,
  };
}

export function pickMarketingAssignee(input: {
  policy: MarketingRoutingPolicy;
  context: MarketingRoutingContext;
}): MarketingAssigneePick {
  const { policy, context } = input;

  if (policy.mode === "SINGLE_USER") {
    const userId = policy.assigneeUserId?.trim();
    if (!userId) routingUnconfigured("SINGLE_USER routing requires assigneeUserId");
    return { userId, mode: policy.mode };
  }

  if (policy.mode === "TEAM") {
    if (!policy.teamId?.trim()) {
      routingUnconfigured("TEAM routing requires teamId");
    }
    const pool = membersForTeam(policy.members, policy.teamId);
    if (pool.length === 0) {
      routingUnconfigured("TEAM routing requires members for the configured team");
    }
    const picked = roundRobinPick(pool, policy.rrCursor);
    return {
      userId: picked.member.userId,
      mode: policy.mode,
      nextCursor: picked.nextCursor,
    };
  }

  if (policy.mode === "ROUND_ROBIN") {
    const picked = roundRobinPick(policy.members, policy.rrCursor);
    return {
      userId: picked.member.userId,
      mode: policy.mode,
      nextCursor: picked.nextCursor,
    };
  }

  if (policy.mode === "USER_POOL") {
    if (policy.members.length === 0) {
      routingUnconfigured("USER_POOL routing requires members");
    }
    const idx = policy.rrCursor % policy.members.length;
    return { userId: policy.members[idx]!.userId, mode: policy.mode };
  }

  // RULE_BASED — closed criteria first, then geography→member.territory, then fallback.
  const rules = policy.rules ?? [];
  const matched = rules.length ? matchClosedRule(rules, context) : null;
  if (matched) {
    const direct = matched.assigneeUserId?.trim();
    if (direct) {
      return { userId: direct, mode: policy.mode, matchedRuleId: matched.id };
    }
    if (matched.teamId) {
      const pool = membersForTeam(policy.members, matched.teamId);
      const picked = roundRobinPick(pool, policy.rrCursor);
      return {
        userId: picked.member.userId,
        mode: policy.mode,
        matchedRuleId: matched.id,
        nextCursor: picked.nextCursor,
      };
    }
  }

  const geography = context.geography;
  if (geography) {
    const byTerritory = policy.members.find((m) => norm(m.territory) === geography);
    if (byTerritory) {
      return { userId: byTerritory.userId, mode: policy.mode };
    }
  }

  const fallback = policy.fallbackAssigneeUserId?.trim() || policy.members[0]?.userId;
  if (!fallback) routingUnconfigured("RULE_BASED routing requires a matching rule, members, or fallback");
  return { userId: fallback, mode: policy.mode };
}
