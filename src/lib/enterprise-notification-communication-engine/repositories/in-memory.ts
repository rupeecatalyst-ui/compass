/**
 * ENCE in-memory adapters.
 */

import type {
  EnceAuditReference,
  EnceCommunicationPolicy,
  EnceCommunicationTemplate,
  EnceSimulationRecord,
} from "@/types/enterprise-notification-communication-engine";
import type { EncePorts } from "@/types/enterprise-notification-communication-engine-ports";

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

export function createInMemoryEncePorts(): EncePorts {
  const policies = createMutableListStore<EnceCommunicationPolicy>();
  const templates = createMutableListStore<EnceCommunicationTemplate>();
  const simulations = createMutableListStore<EnceSimulationRecord>();
  const auditReferences = createMutableListStore<EnceAuditReference>();

  return {
    policies: {
      list: () => policies.list(),
      findById: (id) => policies.list().find((p) => p.id === id),
      findByCode: (policyCode) => policies.list().find((p) => p.policyCode === policyCode),
      save: (p) => policies.upsert(p, (i) => i.id),
      replaceAll: (items) => policies.replaceAll(items),
    },
    templates: {
      list: () => templates.list(),
      findById: (id) => templates.list().find((t) => t.id === id),
      findByCode: (templateCode) => templates.list().find((t) => t.templateCode === templateCode),
      save: (t) => templates.upsert(t, (i) => i.id),
      replaceAll: (items) => templates.replaceAll(items),
    },
    simulations: {
      list: () => simulations.list(),
      findById: (id) => simulations.list().find((s) => s.id === id),
      save: (s) => simulations.upsert(s, (i) => i.id),
      replaceAll: (items) => simulations.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
