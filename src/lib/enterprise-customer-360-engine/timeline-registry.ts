/**
 * EC360 timeline registry.
 */

import type { Ec360CustomerTimelineEntry, Ec360TimelineEventType } from "@/types/enterprise-customer-360-engine";
import { getEc360Ports } from "./composition";

export function appendEc360TimelineEntry(input: {
  customerId: string;
  eventType: Ec360TimelineEventType;
  title: string;
  description: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): Ec360CustomerTimelineEntry {
  const entry: Ec360CustomerTimelineEntry = {
    id: crypto.randomUUID(),
    customerId: input.customerId,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    actorId: input.actorId,
    occurredOn: new Date().toISOString(),
    metadata: input.metadata,
  };

  getEc360Ports().timeline.save(entry);
  return entry;
}

export function listEc360Timeline(customerId: string): Ec360CustomerTimelineEntry[] {
  return getEc360Ports().timeline.listByCustomer(customerId);
}
