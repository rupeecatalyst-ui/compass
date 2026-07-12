/**
 * Adapters — map framework events toward Alert Center presentation contracts.
 * Does not redesign Alert Center UI.
 */

import type { EnterpriseAlertEvent } from "../contracts";

/** Loose projection for Alert Center / Situation Room consumers */
export interface AlertCenterProjection {
  id: string;
  title: string;
  summary: string;
  category: string;
  severity: EnterpriseAlertEvent["severity"];
  sourceModule: string;
  generatedAt: string;
  recommendedAction: string;
  lifecycleState: EnterpriseAlertEvent["lifecycleState"];
  acknowledged: boolean;
  fingerprint?: string;
  groupKey?: string;
}

export function projectAlertEventToCenter(event: EnterpriseAlertEvent): AlertCenterProjection {
  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    category: event.category,
    severity: event.severity,
    sourceModule: event.sourceModule,
    generatedAt: event.generatedAt,
    recommendedAction: event.recommendedAction ?? "Review in Alert Center.",
    lifecycleState: event.lifecycleState,
    acknowledged: event.lifecycleState === "acknowledged" || Boolean(event.acknowledgedAt),
    fingerprint: event.fingerprint,
    groupKey: event.groupKey,
  };
}

export function projectAlertEventsToCenter(
  events: readonly EnterpriseAlertEvent[],
): AlertCenterProjection[] {
  return events.map(projectAlertEventToCenter);
}
