/**
 * LIFE in-memory adapters.
 */

import type { LifeAuditReference, LifeLenderContact, LifeRecommendationHint } from "@/types/enterprise-life-engine";
import type { LifePorts } from "@/types/enterprise-life-engine-ports";

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

export function createInMemoryLifePorts(): LifePorts {
  const contacts = createMutableListStore<LifeLenderContact>();
  const recommendationHints = createMutableListStore<LifeRecommendationHint>();
  const auditReferences = createMutableListStore<LifeAuditReference>();

  return {
    contacts: {
      list: () => contacts.list(),
      findById: (id) => contacts.list().find((c) => c.id === id),
      findByCode: (code) => contacts.list().find((c) => c.contactCode === code),
      listByLender: (lenderRef) => contacts.list().filter((c) => c.lenderRef === lenderRef),
      listLenderExecutors: () => contacts.list().filter((c) => c.lenderExecutor && c.enabled),
      save: (c) => contacts.upsert(c, (i) => i.id),
      replaceAll: (items) => contacts.replaceAll(items),
    },
    recommendationHints: {
      list: () => recommendationHints.list(),
      listByContact: (contactId) => recommendationHints.list().filter((h) => h.contactId === contactId),
      save: (h) => recommendationHints.upsert(h, (i) => i.id),
      replaceAll: (items) => recommendationHints.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
