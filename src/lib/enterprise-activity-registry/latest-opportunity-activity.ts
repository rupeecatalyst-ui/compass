/**
 * Overlay Deal Registry "Updated" with latest meaningful EAR activity.
 * Mapper fallback (stageEnteredAt → createdAt) remains when no operational EAR exists.
 * Never uses Deal.updatedAt.
 */

import type { DealRegistryRow } from "@/types/deal-registry";
import type { EnterpriseActivityEvent } from "@/types/enterprise-activity-registry";
import { isOperationalTimelineEvent } from "./transaction-timeline";

export function formatDealLastActivityLabel(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function latestOperationalOccurredAtByOpportunity(
  events: EnterpriseActivityEvent[],
): Map<string, string> {
  const latest = new Map<string, string>();
  for (const event of events) {
    if (!isOperationalTimelineEvent(event)) continue;
    const opportunityId = event.opportunityId?.trim();
    if (!opportunityId) continue;
    const occurredAt = event.occurredAt?.trim();
    if (!occurredAt) continue;
    const previous = latest.get(opportunityId);
    if (!previous || occurredAt > previous) latest.set(opportunityId, occurredAt);
  }
  return latest;
}

export function overlayDealRowsWithEarLastActivity(
  rows: DealRegistryRow[],
  events: EnterpriseActivityEvent[],
): DealRegistryRow[] {
  const latest = latestOperationalOccurredAtByOpportunity(events);
  if (latest.size === 0) return rows;
  return rows.map((row) => {
    const opportunityId = row.opportunityId?.trim();
    if (!opportunityId) return row;
    const earOccurredAt = latest.get(opportunityId);
    if (!earOccurredAt) return row;
    const fallback = row.lastActivity || "";
    if (fallback && fallback >= earOccurredAt) return row;
    return {
      ...row,
      lastActivity: earOccurredAt,
      lastActivityLabel: formatDealLastActivityLabel(earOccurredAt),
    };
  });
}
