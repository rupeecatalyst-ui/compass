/**
 * ETE ports — repository contracts.
 */

import type {
  EteAuditReference,
  EteRegistrySnapshot,
  EteTask,
} from "./enterprise-task-engine";

export interface EteTaskRepositoryPort {
  list(): EteTask[];
  findById(id: string): EteTask | undefined;
  listByAssignee(assigneeRef: string): EteTask[];
  listByOpportunity(opportunityRef: string): EteTask[];
  save(task: EteTask): void;
  replaceAll(tasks: EteTask[]): void;
}

export interface EteAuditReferenceRepositoryPort {
  list(): EteAuditReference[];
  save(reference: EteAuditReference): void;
  replaceAll(references: EteAuditReference[]): void;
}

export interface EtePorts {
  tasks: EteTaskRepositoryPort;
  auditReferences: EteAuditReferenceRepositoryPort;
}

export type PartialEtePorts = Partial<EtePorts>;
export type { EteRegistrySnapshot };
