/**
 * Alert routing — declarative channel selection only.
 * Does not invoke transports or workflows.
 */

import type {
  AlertChannelRegistryPort,
  EnterpriseAlertEvent,
  EnterpriseAlertRule,
} from "../contracts";
import type { AlertFrameworkChannelKind } from "../types";
import { defaultAlertChannelRegistry } from "../registry";

export interface AlertRouteResult {
  channelIds: readonly string[];
  matchedRuleIds: readonly string[];
  mode: "default" | "rules";
}

export interface AlertRoutingOptions {
  channelRegistry?: AlertChannelRegistryPort;
  rules?: readonly EnterpriseAlertRule[];
  allowedChannelKinds?: readonly AlertFrameworkChannelKind[];
}

function severityMatches(
  event: EnterpriseAlertEvent,
  rule: EnterpriseAlertRule,
): boolean {
  if (!rule.matchSeverity?.length) return true;
  return rule.matchSeverity.includes(event.severity);
}

function publisherMatches(
  event: EnterpriseAlertEvent,
  rule: EnterpriseAlertRule,
): boolean {
  if (!rule.matchPublisherIds?.length) return true;
  return rule.matchPublisherIds.includes(event.sourcePublisherId);
}

function categoryMatches(
  event: EnterpriseAlertEvent,
  rule: EnterpriseAlertRule,
): boolean {
  if (!rule.matchCategories?.length) return true;
  return rule.matchCategories.includes(event.category);
}

/**
 * Placeholder router: prefers enabled Mission Control channel;
 * optionally intersects enabled rules (no side effects).
 */
export function routeAlertEvent(
  event: EnterpriseAlertEvent,
  options: AlertRoutingOptions = {},
): AlertRouteResult {
  const channelRegistry = options.channelRegistry ?? defaultAlertChannelRegistry;
  const allowed = new Set(options.allowedChannelKinds ?? ["mission_control"]);
  const enabled = channelRegistry
    .listEnabled()
    .filter((c) => allowed.has(c.kind));

  const rules = (options.rules ?? []).filter((r) => r.enabled);
  const matched = rules.filter(
    (r) =>
      severityMatches(event, r) &&
      publisherMatches(event, r) &&
      categoryMatches(event, r),
  );

  if (matched.length === 0) {
    return {
      channelIds: enabled.map((c) => c.id),
      matchedRuleIds: [],
      mode: "default",
    };
  }

  const channelIds = [
    ...new Set(matched.flatMap((r) => r.channelIds).filter((id) => channelRegistry.get(id))),
  ];

  return {
    channelIds: channelIds.length > 0 ? channelIds : enabled.map((c) => c.id),
    matchedRuleIds: matched.map((r) => r.id),
    mode: "rules",
  };
}

/** Seed placeholder rules — not a live rules engine */
export const PLACEHOLDER_ALERT_RULES: readonly EnterpriseAlertRule[] = [
  {
    id: "rule-mc-default",
    name: "Mission Control default",
    description: "Route all accepted alerts to Mission Control channel",
    enabled: true,
    channelIds: ["channel-mission-control"],
    targetIds: ["target-executives"],
    routingMode: "broadcast",
    dedupeStrategy: "fingerprint",
  },
];
