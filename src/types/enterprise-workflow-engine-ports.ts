/**
 * EWE Ports — repository contracts.
 */

import type {
  EweRegistrySnapshot,
  EweWorkflowAuditReference,
  EweWorkflowDefinition,
  EweWorkflowInstance,
  EweWorkflowVersion,
} from "./enterprise-workflow-engine";

export interface EweDefinitionRepositoryPort {
  list(): EweWorkflowDefinition[];
  findById(id: string): EweWorkflowDefinition | undefined;
  findByCode(workflowCode: string, tenantId?: string): EweWorkflowDefinition | undefined;
  save(definition: EweWorkflowDefinition): void;
  replaceAll(definitions: EweWorkflowDefinition[]): void;
}

export interface EweVersionRepositoryPort {
  list(): EweWorkflowVersion[];
  findById(id: string): EweWorkflowVersion | undefined;
  listByDefinition(definitionId: string): EweWorkflowVersion[];
  listByCode(workflowCode: string): EweWorkflowVersion[];
  findByDefinitionAndVersion(
    definitionId: string,
    versionMajor: number,
    versionMinor: number,
  ): EweWorkflowVersion | undefined;
  save(version: EweWorkflowVersion): void;
  replaceAll(versions: EweWorkflowVersion[]): void;
}

export interface EweInstanceRepositoryPort {
  list(): EweWorkflowInstance[];
  findById(id: string): EweWorkflowInstance | undefined;
  listByDefinition(definitionId: string): EweWorkflowInstance[];
  listByVersion(versionId: string): EweWorkflowInstance[];
  save(instance: EweWorkflowInstance): void;
  replaceAll(instances: EweWorkflowInstance[]): void;
}

export interface EweAuditReferenceRepositoryPort {
  list(): EweWorkflowAuditReference[];
  listByEntity(entityId: string): EweWorkflowAuditReference[];
  save(reference: EweWorkflowAuditReference): void;
  replaceAll(references: EweWorkflowAuditReference[]): void;
}

export interface EwePorts {
  definitions: EweDefinitionRepositoryPort;
  versions: EweVersionRepositoryPort;
  instances: EweInstanceRepositoryPort;
  auditReferences: EweAuditReferenceRepositoryPort;
}

export type PartialEwePorts = Partial<EwePorts>;

export type { EweRegistrySnapshot };
