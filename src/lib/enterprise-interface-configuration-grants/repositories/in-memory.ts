/**
 * ECG in-memory adapters (SPR-005 extended).
 */

import type {
  EcgAuditReference,
  EcgConfigChangeAudit,
  EcgConfigPackage,
  EcgConfigurationDomain,
  EcgEngineRegistration,
  EcgSectionDefinition,
} from "@/types/enterprise-interface-configuration-grants";
import type { EcgPorts } from "@/types/enterprise-interface-configuration-grants-ports";

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

export function createInMemoryEcgPorts(): EcgPorts {
  const sections = createMutableListStore<EcgSectionDefinition>();
  const domains = createMutableListStore<EcgConfigurationDomain>();
  const engines = createMutableListStore<EcgEngineRegistration>();
  const packages = createMutableListStore<EcgConfigPackage>();
  const configAudits = createMutableListStore<EcgConfigChangeAudit>();
  const auditReferences = createMutableListStore<EcgAuditReference>();

  return {
    sections: {
      list: () => sections.list(),
      findById: (id) => sections.list().find((s) => s.id === id),
      findByCode: (sectionCode) => sections.list().find((s) => s.sectionCode === sectionCode),
      listByKind: (kind) => sections.list().filter((s) => s.kind === kind),
      save: (s) => sections.upsert(s, (i) => i.id),
      replaceAll: (items) => sections.replaceAll(items),
    },
    domains: {
      list: () => domains.list(),
      findByKey: (domainKey) => domains.list().find((d) => d.domainKey === domainKey),
      save: (d) => domains.upsert(d, (i) => i.domainKey),
      replaceAll: (items) => domains.replaceAll(items),
    },
    engines: {
      list: () => engines.list(),
      findByKey: (engineKey) => engines.list().find((e) => e.engineKey === engineKey),
      save: (e) => engines.upsert(e, (i) => i.engineKey),
      replaceAll: (items) => engines.replaceAll(items),
    },
    packages: {
      list: () => packages.list(),
      findById: (id) => packages.list().find((p) => p.id === id),
      listByDomain: (domainKey) => packages.list().filter((p) => p.domainKey === domainKey),
      findPublished: (domainKey) =>
        packages.list().find((p) => p.domainKey === domainKey && p.isPublished),
      findDraft: (domainKey) =>
        packages
          .list()
          .filter((p) => p.domainKey === domainKey && !p.isPublished && p.lifecycleState === "draft")
          .sort((a, b) => new Date(b.modifiedOn).getTime() - new Date(a.modifiedOn).getTime())[0],
      save: (p) => packages.upsert(p, (i) => i.id),
      replaceAll: (items) => packages.replaceAll(items),
    },
    configAudits: {
      list: () => configAudits.list(),
      listByDomain: (domainKey) => configAudits.list().filter((a) => a.domainKey === domainKey),
      save: (e) => configAudits.upsert(e, (i) => i.id),
      replaceAll: (items) => configAudits.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
