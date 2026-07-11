/**
 * EFOE financial timeline registry.
 */

import type {
  EfoeFinancialTimelineEntry,
  EfoeFinancialTimelineEventType,
} from "@/types/enterprise-financial-operations-engine";
import { getEfoePorts } from "./composition";

export function appendEfoeTimelineEntry(input: {
  transactionRef: string;
  eventType: EfoeFinancialTimelineEventType;
  title: string;
  description: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): EfoeFinancialTimelineEntry {
  const entry: EfoeFinancialTimelineEntry = {
    id: crypto.randomUUID(),
    transactionRef: input.transactionRef,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    actorId: input.actorId,
    occurredOn: new Date().toISOString(),
    metadata: input.metadata,
  };

  getEfoePorts().timeline.save(entry);
  return entry;
}

export function listEfoeTimeline(transactionRef: string): EfoeFinancialTimelineEntry[] {
  return getEfoePorts().timeline.listByTransaction(transactionRef);
}
