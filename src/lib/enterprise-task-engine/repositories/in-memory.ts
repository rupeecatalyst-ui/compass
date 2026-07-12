/**
 * ETE in-memory adapters.
 */

import type { EteAuditReference, EteTask } from "@/types/enterprise-task-engine";
import type { EtePorts } from "@/types/enterprise-task-engine-ports";

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

export function createInMemoryEtePorts(): EtePorts {
  const tasks = createMutableListStore<EteTask>();
  const auditReferences = createMutableListStore<EteAuditReference>();

  return {
    tasks: {
      list: () => tasks.list(),
      findById: (id) => tasks.list().find((t) => t.id === id),
      listByAssignee: (assigneeRef) => tasks.list().filter((t) => t.assigneeRef === assigneeRef),
      listByOpportunity: (opportunityRef) =>
        tasks.list().filter((t) => t.opportunityRef === opportunityRef),
      save: (task) => tasks.upsert(task, (t) => t.id),
      replaceAll: (items) => tasks.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
