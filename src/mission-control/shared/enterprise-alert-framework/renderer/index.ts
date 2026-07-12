/**
 * Alert renderer — ordering, grouping, dedupe flags.
 * Placeholder structural transforms only.
 */

import type {
  AlertRenderGroup,
  AlertRenderModel,
  AlertRenderOptions,
  EnterpriseAlertEvent,
} from "../contracts";
import type { AlertFrameworkPriority, AlertFrameworkSeverity, AlertLifecycleState } from "../types";
import { getAlertLifecycleDefinition } from "../lifecycle";

const SEVERITY_RANK: Record<AlertFrameworkSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const PRIORITY_RANK: Record<AlertFrameworkPriority, number> = {
  p1: 5,
  p2: 4,
  p3: 3,
  p4: 2,
  p5: 1,
};

function lifecycleRank(state: AlertLifecycleState): number {
  return getAlertLifecycleDefinition(state)?.order ?? 0;
}

function dedupeKey(event: EnterpriseAlertEvent, strategy: AlertRenderOptions["dedupeStrategy"]): string {
  switch (strategy) {
    case "fingerprint":
      return event.fingerprint ?? `${event.title}::${event.sourceModule}`;
    case "title_source":
      return `${event.title}::${event.sourceModule}`;
    case "custom":
      return event.groupKey ?? event.fingerprint ?? event.id;
    case "none":
    default:
      return event.id;
  }
}

function deduplicateEvents(
  events: readonly EnterpriseAlertEvent[],
  strategy: AlertRenderOptions["dedupeStrategy"] = "fingerprint",
): EnterpriseAlertEvent[] {
  if (strategy === "none") return [...events];
  const seen = new Set<string>();
  const result: EnterpriseAlertEvent[] = [];
  for (const event of events) {
    if (!event.dedupe && strategy !== "fingerprint") {
      result.push(event);
      continue;
    }
    const key = dedupeKey(event, strategy);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

function orderEvents(
  events: readonly EnterpriseAlertEvent[],
  orderBy: AlertRenderOptions["orderBy"] = "priority",
): EnterpriseAlertEvent[] {
  const copy = [...events];
  copy.sort((a, b) => {
    if (orderBy === "severity") {
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    }
    if (orderBy === "generatedAt") {
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    }
    if (orderBy === "lifecycle") {
      return lifecycleRank(a.lifecycleState) - lifecycleRank(b.lifecycleState);
    }
    const byPriority = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (byPriority !== 0) return byPriority;
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  });
  return copy;
}

function groupEvents(
  events: readonly EnterpriseAlertEvent[],
  groupBy: AlertRenderOptions["groupBy"] = "none",
): AlertRenderGroup[] {
  if (!groupBy || groupBy === "none") {
    return [{ key: "all", label: "All alerts", events }];
  }

  const map = new Map<string, EnterpriseAlertEvent[]>();
  for (const event of events) {
    const key =
      groupBy === "sourceModule"
        ? event.sourceModule
        : groupBy === "category"
          ? event.category
          : groupBy === "severity"
            ? event.severity
            : groupBy === "lifecycle"
              ? event.lifecycleState
              : (event.groupKey ?? "ungrouped");
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }

  return [...map.entries()].map(([key, groupEventsList]) => ({
    key,
    label: key,
    events: groupEventsList,
  }));
}

/**
 * Pure renderer pipeline for Mission Control consumers.
 */
export function renderAlertEvents(
  events: readonly EnterpriseAlertEvent[],
  options: AlertRenderOptions = {},
): AlertRenderModel {
  const orderBy = options.orderBy ?? "priority";
  const groupBy = options.groupBy ?? "none";
  const deduplicate = options.deduplicate ?? false;
  const dedupeStrategy = options.dedupeStrategy ?? "fingerprint";

  let working = [...events];
  if (deduplicate) {
    working = deduplicateEvents(working, dedupeStrategy);
  }
  working = orderEvents(working, orderBy);
  const groups = groupEvents(working, groupBy);

  return {
    events: working,
    groups,
    orderedBy: orderBy,
    groupedBy: groupBy,
    deduplicated: deduplicate,
  };
}

export interface AlertRenderer {
  render(
    events: readonly EnterpriseAlertEvent[],
    options?: AlertRenderOptions,
  ): AlertRenderModel;
}

export function createAlertRenderer(): AlertRenderer {
  return {
    render(events, options) {
      return renderAlertEvents(events, options);
    },
  };
}
