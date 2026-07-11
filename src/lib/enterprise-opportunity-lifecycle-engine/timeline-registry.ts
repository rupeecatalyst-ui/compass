/**
 * EOLE timeline registry.
 */

import type { EoleOpportunityTimelineEntry, EoleTimelineEventType } from "@/types/enterprise-opportunity-lifecycle-engine";
import { getEolePorts } from "./composition";

export function appendEoleTimelineEntry(input: {
  opportunityId: string;
  eventType: EoleTimelineEventType;
  title: string;
  description: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): EoleOpportunityTimelineEntry {
  const entry: EoleOpportunityTimelineEntry = {
    id: crypto.randomUUID(),
    opportunityId: input.opportunityId,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    actorId: input.actorId,
    occurredOn: new Date().toISOString(),
    metadata: input.metadata,
  };

  getEolePorts().timeline.save(entry);
  return entry;
}

export function listEoleTimeline(opportunityId: string): EoleOpportunityTimelineEntry[] {
  return getEolePorts().timeline.listByOpportunity(opportunityId);
}
