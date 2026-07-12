/**
 * LIFE ports — repository contracts.
 */

import type {
  LifeAuditReference,
  LifeLenderContact,
  LifeRecommendationHint,
  LifeRegistrySnapshot,
} from "./enterprise-life-engine";

export interface LifeLenderContactRepositoryPort {
  list(): LifeLenderContact[];
  findById(id: string): LifeLenderContact | undefined;
  findByCode(contactCode: string): LifeLenderContact | undefined;
  listByLender(lenderRef: string): LifeLenderContact[];
  listLenderExecutors(): LifeLenderContact[];
  save(contact: LifeLenderContact): void;
  replaceAll(contacts: LifeLenderContact[]): void;
}

export interface LifeRecommendationHintRepositoryPort {
  list(): LifeRecommendationHint[];
  listByContact(contactId: string): LifeRecommendationHint[];
  save(hint: LifeRecommendationHint): void;
  replaceAll(hints: LifeRecommendationHint[]): void;
}

export interface LifeAuditReferenceRepositoryPort {
  list(): LifeAuditReference[];
  save(reference: LifeAuditReference): void;
  replaceAll(references: LifeAuditReference[]): void;
}

export interface LifePorts {
  contacts: LifeLenderContactRepositoryPort;
  recommendationHints: LifeRecommendationHintRepositoryPort;
  auditReferences: LifeAuditReferenceRepositoryPort;
}

export type PartialLifePorts = Partial<LifePorts>;
export type { LifeRegistrySnapshot };
