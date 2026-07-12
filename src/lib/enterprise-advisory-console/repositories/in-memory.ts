/**
 * EAC in-memory adapters.
 */

import type {
  EacAdvisoryCard,
  EacAuditReference,
  EacLifecycleEvent,
  EacOverrideRecord,
} from "@/types/enterprise-advisory-console";
import type { EacPorts } from "@/types/enterprise-advisory-console-ports";

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

export function createInMemoryEacPorts(): EacPorts {
  const advisories = createMutableListStore<EacAdvisoryCard>();
  const lifecycleEvents = createMutableListStore<EacLifecycleEvent>();
  const overrides = createMutableListStore<EacOverrideRecord>();
  const auditReferences = createMutableListStore<EacAuditReference>();

  return {
    advisories: {
      list: () => advisories.list(),
      findById: (id) => advisories.list().find((a) => a.advisoryId === id),
      listByOpportunity: (opportunityId) =>
        advisories.list().filter((a) => a.opportunityId === opportunityId),
      save: (c) => advisories.upsert(c, (i) => i.advisoryId),
      replaceAll: (items) => advisories.replaceAll(items),
    },
    lifecycleEvents: {
      list: () => lifecycleEvents.list(),
      listByAdvisory: (advisoryId) =>
        lifecycleEvents.list().filter((e) => e.advisoryId === advisoryId),
      save: (e) => lifecycleEvents.upsert(e, (i) => i.eventId),
      replaceAll: (items) => lifecycleEvents.replaceAll(items),
    },
    overrides: {
      list: () => overrides.list(),
      listByAdvisory: (advisoryId) =>
        overrides.list().filter((o) => o.advisoryId === advisoryId),
      save: (o) => overrides.upsert(o, (i) => i.overrideId),
      replaceAll: (items) => overrides.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
