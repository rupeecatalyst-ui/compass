/**
 * EDIE timeline registry.
 */

import type { EdieDocumentTimelineEntry, EdieTimelineEventType } from "@/types/enterprise-document-intelligence-engine";
import { getEdiePorts } from "./composition";

export function appendEdieTimelineEntry(input: {
  documentId: string;
  eventType: EdieTimelineEventType;
  title: string;
  description: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}): EdieDocumentTimelineEntry {
  const entry: EdieDocumentTimelineEntry = {
    id: crypto.randomUUID(),
    documentId: input.documentId,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    actorId: input.actorId,
    occurredOn: new Date().toISOString(),
    metadata: input.metadata,
  };

  getEdiePorts().timeline.save(entry);
  return entry;
}

export function listEdieTimeline(documentId: string): EdieDocumentTimelineEntry[] {
  return getEdiePorts().timeline.listByDocument(documentId);
}
