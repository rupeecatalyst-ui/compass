/**
 * EWOE in-memory adapters.
 */

import type {
  EwoeAuditReference,
  EwoeWorkflowDefinition,
  EwoeWorkflowEvent,
  EwoeWorkflowInstance,
  EwoeWorkflowTransition,
} from "@/types/enterprise-workflow-orchestration-engine";
import type { EwoePorts } from "@/types/enterprise-workflow-orchestration-engine-ports";

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

export function createInMemoryEwoePorts(): EwoePorts {
  const definitions = createMutableListStore<EwoeWorkflowDefinition>();
  const instances = createMutableListStore<EwoeWorkflowInstance>();
  const transitions = createMutableListStore<EwoeWorkflowTransition>();
  const events = createMutableListStore<EwoeWorkflowEvent>();
  const auditReferences = createMutableListStore<EwoeAuditReference>();

  return {
    definitions: {
      list: () => definitions.list(),
      findById: (id) => definitions.list().find((d) => d.id === id),
      findByCode: (code) => definitions.list().find((d) => d.definitionCode === code),
      save: (d) => definitions.upsert(d, (i) => i.id),
      replaceAll: (items) => definitions.replaceAll(items),
    },
    instances: {
      list: () => instances.list(),
      findById: (id) => instances.list().find((i) => i.id === id),
      findByOpportunity: (opportunityId) =>
        instances.list().find((i) => i.opportunityId === opportunityId && i.status !== "cancelled"),
      save: (i) => instances.upsert(i, (x) => x.id),
      replaceAll: (items) => instances.replaceAll(items),
    },
    transitions: {
      list: () => transitions.list(),
      listByInstance: (instanceId) => transitions.list().filter((t) => t.instanceId === instanceId),
      listByOpportunity: (opportunityId) =>
        transitions.list().filter((t) => t.opportunityId === opportunityId),
      save: (t) => transitions.upsert(t, (i) => i.id),
      replaceAll: (items) => transitions.replaceAll(items),
    },
    events: {
      list: () => events.list(),
      listByOpportunity: (opportunityId) => events.list().filter((e) => e.opportunityId === opportunityId),
      save: (e) => events.upsert(e, (i) => i.id),
      replaceAll: (items) => events.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
