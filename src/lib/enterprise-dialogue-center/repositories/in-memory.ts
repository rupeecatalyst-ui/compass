/**
 * EDC in-memory adapters.
 */

import type { EdcAuditReference, EdcTimelineEntry } from "@/types/enterprise-dialogue-center";
import type { EdcPorts } from "@/types/enterprise-dialogue-center-ports";

function createMutableListStore<T>() {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next: T[]) => {
      items = next;
    },
    upsert: (item: T, key: (item: T) => string) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEdcPorts(): EdcPorts {
  const timeline = createMutableListStore<EdcTimelineEntry>();
  const auditReferences = createMutableListStore<EdcAuditReference>();

  return {
    timeline: {
      list: () => timeline.list(),
      listByContext: (contextType, contextId) =>
        timeline
          .list()
          .filter((e) => e.contextRef.type === contextType && e.contextRef.id === contextId),
      findById: (id) => timeline.list().find((e) => e.id === id),
      save: (entry) => timeline.upsert(entry, (e) => e.id),
      replaceAll: (items) => timeline.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
