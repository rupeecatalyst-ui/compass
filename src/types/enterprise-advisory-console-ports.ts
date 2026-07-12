/**
 * EAC ports — repository contracts (SPR-006D).
 */

import type {
  EacAdvisoryCard,
  EacAuditReference,
  EacLifecycleEvent,
  EacOverrideRecord,
  EacRegistrySnapshot,
} from "./enterprise-advisory-console";

export interface EacAdvisoryRepositoryPort {
  list(): EacAdvisoryCard[];
  findById(advisoryId: string): EacAdvisoryCard | undefined;
  listByOpportunity(opportunityId: string): EacAdvisoryCard[];
  save(card: EacAdvisoryCard): void;
  replaceAll(cards: EacAdvisoryCard[]): void;
}

export interface EacLifecycleEventRepositoryPort {
  list(): EacLifecycleEvent[];
  listByAdvisory(advisoryId: string): EacLifecycleEvent[];
  save(event: EacLifecycleEvent): void;
  replaceAll(events: EacLifecycleEvent[]): void;
}

export interface EacOverrideRepositoryPort {
  list(): EacOverrideRecord[];
  listByAdvisory(advisoryId: string): EacOverrideRecord[];
  save(record: EacOverrideRecord): void;
  replaceAll(records: EacOverrideRecord[]): void;
}

export interface EacAuditReferenceRepositoryPort {
  list(): EacAuditReference[];
  save(reference: EacAuditReference): void;
  replaceAll(references: EacAuditReference[]): void;
}

export interface EacPorts {
  advisories: EacAdvisoryRepositoryPort;
  lifecycleEvents: EacLifecycleEventRepositoryPort;
  overrides: EacOverrideRepositoryPort;
  auditReferences: EacAuditReferenceRepositoryPort;
}

export type PartialEacPorts = Partial<EacPorts>;
export type { EacRegistrySnapshot };
