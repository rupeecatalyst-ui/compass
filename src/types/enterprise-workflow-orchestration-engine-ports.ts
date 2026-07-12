/**
 * EWOE ports — repository contracts.
 */

import type {
  EwoeAuditReference,
  EwoeRegistrySnapshot,
  EwoeWorkflowDefinition,
  EwoeWorkflowEvent,
  EwoeWorkflowInstance,
  EwoeWorkflowTransition,
} from "./enterprise-workflow-orchestration-engine";

export interface EwoeDefinitionRepositoryPort {
  list(): EwoeWorkflowDefinition[];
  findById(id: string): EwoeWorkflowDefinition | undefined;
  findByCode(code: string): EwoeWorkflowDefinition | undefined;
  save(definition: EwoeWorkflowDefinition): void;
  replaceAll(definitions: EwoeWorkflowDefinition[]): void;
}

export interface EwoeInstanceRepositoryPort {
  list(): EwoeWorkflowInstance[];
  findById(id: string): EwoeWorkflowInstance | undefined;
  findByOpportunity(opportunityId: string): EwoeWorkflowInstance | undefined;
  save(instance: EwoeWorkflowInstance): void;
  replaceAll(instances: EwoeWorkflowInstance[]): void;
}

export interface EwoeTransitionRepositoryPort {
  list(): EwoeWorkflowTransition[];
  listByInstance(instanceId: string): EwoeWorkflowTransition[];
  listByOpportunity(opportunityId: string): EwoeWorkflowTransition[];
  save(transition: EwoeWorkflowTransition): void;
  replaceAll(transitions: EwoeWorkflowTransition[]): void;
}

export interface EwoeEventRepositoryPort {
  list(): EwoeWorkflowEvent[];
  listByOpportunity(opportunityId: string): EwoeWorkflowEvent[];
  save(event: EwoeWorkflowEvent): void;
  replaceAll(events: EwoeWorkflowEvent[]): void;
}

export interface EwoeAuditReferenceRepositoryPort {
  list(): EwoeAuditReference[];
  save(reference: EwoeAuditReference): void;
  replaceAll(references: EwoeAuditReference[]): void;
}

export interface EwoePorts {
  definitions: EwoeDefinitionRepositoryPort;
  instances: EwoeInstanceRepositoryPort;
  transitions: EwoeTransitionRepositoryPort;
  events: EwoeEventRepositoryPort;
  auditReferences: EwoeAuditReferenceRepositoryPort;
}

export type PartialEwoePorts = Partial<EwoePorts>;
export type { EwoeRegistrySnapshot };
