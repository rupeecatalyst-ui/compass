/**
 * EWE in-memory adapters — Sprint 5 default implementation.
 */

import type {
  EweWorkflowAuditReference,
  EweWorkflowDefinition,
  EweWorkflowInstance,
  EweWorkflowVersion,
} from "@/types/enterprise-workflow-engine";
import type { EwePorts } from "@/types/enterprise-workflow-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEwePorts(): EwePorts {
  const definitions = createMutableListStore<EweWorkflowDefinition>();
  const versions = createMutableListStore<EweWorkflowVersion>();
  const instances = createMutableListStore<EweWorkflowInstance>();
  const auditReferences = createMutableListStore<EweWorkflowAuditReference>();

  return {
    definitions: {
      list: () => definitions.list(),
      findById: (id) => definitions.list().find((d) => d.id === id),
      findByCode: (workflowCode, tenantId) =>
        definitions
          .list()
          .find(
            (d) =>
              d.workflowCode === workflowCode &&
              d.enabled &&
              (tenantId === undefined || d.tenantId === tenantId),
          ),
      save: (definition) => definitions.upsert(definition, (d) => d.id),
      replaceAll: (items) => definitions.replaceAll(items),
    },
    versions: {
      list: () => versions.list(),
      findById: (id) => versions.list().find((v) => v.id === id),
      listByDefinition: (definitionId) =>
        versions.list().filter((v) => v.definitionId === definitionId),
      listByCode: (workflowCode) =>
        versions.list().filter((v) => v.workflowCode === workflowCode),
      findByDefinitionAndVersion: (definitionId, versionMajor, versionMinor) =>
        versions
          .list()
          .find(
            (v) =>
              v.definitionId === definitionId &&
              v.versionMajor === versionMajor &&
              v.versionMinor === versionMinor,
          ),
      save: (version) => versions.upsert(version, (v) => v.id),
      replaceAll: (items) => versions.replaceAll(items),
    },
    instances: {
      list: () => instances.list(),
      findById: (id) => instances.list().find((i) => i.id === id),
      listByDefinition: (definitionId) =>
        instances.list().filter((i) => i.definitionId === definitionId),
      listByVersion: (versionId) => instances.list().filter((i) => i.versionId === versionId),
      save: (instance) => instances.upsert(instance, (i) => i.id),
      replaceAll: (items) => instances.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) =>
        auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
