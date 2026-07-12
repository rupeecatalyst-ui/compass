/**
 * ECM ports — repository contracts.
 */

import type {
  EcmAuditReference,
  EcmContact,
  EcmRegistrySnapshot,
} from "./enterprise-contact-master";

export interface EcmContactRepositoryPort {
  list(): EcmContact[];
  findById(id: string): EcmContact | undefined;
  save(contact: EcmContact): void;
  replaceAll(contacts: EcmContact[]): void;
}

export interface EcmAuditReferenceRepositoryPort {
  list(): EcmAuditReference[];
  save(reference: EcmAuditReference): void;
  replaceAll(references: EcmAuditReference[]): void;
}

export interface EcmPorts {
  contacts: EcmContactRepositoryPort;
  auditReferences: EcmAuditReferenceRepositoryPort;
}

export type PartialEcmPorts = Partial<EcmPorts>;
export type { EcmRegistrySnapshot };
