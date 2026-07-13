/**
 * ECM in-memory adapters.
 */

import type {
  EcmAuditReference,
  EcmContact,
  EcmContactRelationship,
} from "@/types/enterprise-contact-master";
import type { EcmPorts } from "@/types/enterprise-contact-master-ports";

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

export function createInMemoryEcmPorts(): EcmPorts {
  const contacts = createMutableListStore<EcmContact>();
  const relationships = createMutableListStore<EcmContactRelationship>();
  const auditReferences = createMutableListStore<EcmAuditReference>();

  return {
    contacts: {
      list: () => contacts.list(),
      findById: (id) => contacts.list().find((c) => c.id === id),
      save: (c) => contacts.upsert(c, (i) => i.id),
      replaceAll: (items) => contacts.replaceAll(items),
    },
    relationships: {
      list: () => relationships.list(),
      findById: (id) => relationships.list().find((r) => r.id === id),
      save: (r) => relationships.upsert(r, (i) => i.id),
      replaceAll: (items) => relationships.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
