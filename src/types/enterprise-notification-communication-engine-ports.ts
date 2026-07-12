/**
 * ENCE ports — repository contracts.
 */

import type {
  EnceAuditReference,
  EnceCommunicationPolicy,
  EnceCommunicationTemplate,
  EnceRegistrySnapshot,
  EnceSimulationRecord,
} from "./enterprise-notification-communication-engine";

export interface EncePolicyRepositoryPort {
  list(): EnceCommunicationPolicy[];
  findById(id: string): EnceCommunicationPolicy | undefined;
  findByCode(policyCode: string): EnceCommunicationPolicy | undefined;
  save(policy: EnceCommunicationPolicy): void;
  replaceAll(policies: EnceCommunicationPolicy[]): void;
}

export interface EnceTemplateRepositoryPort {
  list(): EnceCommunicationTemplate[];
  findById(id: string): EnceCommunicationTemplate | undefined;
  findByCode(templateCode: string): EnceCommunicationTemplate | undefined;
  save(template: EnceCommunicationTemplate): void;
  replaceAll(templates: EnceCommunicationTemplate[]): void;
}

export interface EnceSimulationRepositoryPort {
  list(): EnceSimulationRecord[];
  findById(id: string): EnceSimulationRecord | undefined;
  save(record: EnceSimulationRecord): void;
  replaceAll(records: EnceSimulationRecord[]): void;
}

export interface EnceAuditReferenceRepositoryPort {
  list(): EnceAuditReference[];
  save(reference: EnceAuditReference): void;
  replaceAll(references: EnceAuditReference[]): void;
}

export interface EncePorts {
  policies: EncePolicyRepositoryPort;
  templates: EnceTemplateRepositoryPort;
  simulations: EnceSimulationRepositoryPort;
  auditReferences: EnceAuditReferenceRepositoryPort;
}

export type PartialEncePorts = Partial<EncePorts>;
export type { EnceRegistrySnapshot };
