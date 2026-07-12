/**
 * EDC timeline registry.
 */

import type { EdcTimelineEntry } from "@/types/enterprise-dialogue-center";
import { recordEdcAudit } from "./audit-integration";
import { getEdcPorts } from "./composition";

export function appendEdcTimelineEntry(
  input: Omit<EdcTimelineEntry, "id" | "occurredOn" | "historicalReference"> & {
    occurredOn?: string;
  },
): EdcTimelineEntry {
  const entry: EdcTimelineEntry = {
    ...input,
    id: crypto.randomUUID(),
    occurredOn: input.occurredOn ?? new Date().toISOString(),
    historicalReference: input.migrationMode === true ? true : undefined,
  };

  getEdcPorts().timeline.save(entry);
  recordEdcAudit({
    entityId: entry.id,
    entityType: "timeline_entry",
    action: "created",
    actorId: input.actorId,
    remarks: `EDC ${entry.eventType}: ${entry.title}`,
  });
  return entry;
}

/** Latest first. */
export function listEdcTimeline(): EdcTimelineEntry[] {
  return [...getEdcPorts().timeline.list()].sort(
    (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
  );
}

/** Latest first, filtered by context. */
export function listEdcTimelineByContext(contextType: string, contextId: string): EdcTimelineEntry[] {
  return [...getEdcPorts().timeline.listByContext(contextType, contextId)].sort(
    (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
  );
}
