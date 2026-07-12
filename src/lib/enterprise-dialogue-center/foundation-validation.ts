/**
 * EDC foundation validation — smoke checks for SPR-001.
 */

import { EDC_CONTEXT_TYPES, EDC_EVENT_TYPES, EDC_FRAMEWORK_VERSION } from "@/constants/enterprise-dialogue-center";
import { resetEdcComposition } from "./composition";
import { getEdcFrameworkVersion, getEdcRegistrySnapshot } from "./registry-snapshot";
import { appendEdcTimelineEntry, listEdcTimeline, listEdcTimelineByContext } from "./timeline-registry";

export function runEdcFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEdcComposition();

  const live = appendEdcTimelineEntry({
    contextRef: { type: EDC_CONTEXT_TYPES.OPPORTUNITY, id: "opp-001" },
    eventType: EDC_EVENT_TYPES.STAGE_CHANGE,
    title: "Moved to Processing",
    description: "Stage changed to processing",
    actorId: "system",
  });

  const migrated = appendEdcTimelineEntry({
    contextRef: { type: EDC_CONTEXT_TYPES.OPPORTUNITY, id: "opp-001" },
    eventType: EDC_EVENT_TYPES.PROGRESS,
    title: "Historical progress",
    description: "Migrated entry",
    actorId: "migration",
    migrationMode: true,
  });

  appendEdcTimelineEntry({
    contextRef: { type: EDC_CONTEXT_TYPES.CUSTOMER, id: "cust-001" },
    eventType: EDC_EVENT_TYPES.TASK,
    title: "Follow-up task",
    description: "Customer follow-up",
    actorId: "system",
  });

  const all = listEdcTimeline();
  const byOpp = listEdcTimelineByContext(EDC_CONTEXT_TYPES.OPPORTUNITY, "opp-001");
  const snap = getEdcRegistrySnapshot();

  const passed =
    getEdcFrameworkVersion() === EDC_FRAMEWORK_VERSION &&
    live.historicalReference !== true &&
    migrated.historicalReference === true &&
    all.length === 3 &&
    all[0].occurredOn >= all[1].occurredOn &&
    byOpp.length === 2 &&
    snap.timelineEntries.length === 3 &&
    snap.auditReferences.length >= 3;

  return {
    passed,
    details: {
      frameworkVersion: getEdcFrameworkVersion(),
      timelineEntries: snap.timelineEntries.length,
      opportunityEntries: byOpp.length,
      historicalMarked: migrated.historicalReference,
      auditReferences: snap.auditReferences.length,
    },
  };
}
