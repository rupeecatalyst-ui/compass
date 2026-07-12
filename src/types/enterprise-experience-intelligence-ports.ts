/**
 * EEI ports — repository contracts (SPR-006E).
 */

import type {
  EeiAuditReference,
  EeiExperienceRecord,
  EeiKnowledgeFeedbackRef,
  EeiRegistrySnapshot,
} from "./enterprise-experience-intelligence";

export interface EeiExperienceRepositoryPort {
  list(): EeiExperienceRecord[];
  findById(experienceId: string): EeiExperienceRecord | undefined;
  findByAdvisoryId(advisoryId: string): EeiExperienceRecord | undefined;
  findByDecisionId(decisionId: string): EeiExperienceRecord | undefined;
  listByOpportunity(opportunityId: string): EeiExperienceRecord[];
  save(record: EeiExperienceRecord): void;
  replaceAll(records: EeiExperienceRecord[]): void;
}

export interface EeiKnowledgeFeedbackRepositoryPort {
  list(): EeiKnowledgeFeedbackRef[];
  findById(feedbackId: string): EeiKnowledgeFeedbackRef | undefined;
  listByExperience(experienceId: string): EeiKnowledgeFeedbackRef[];
  save(feedback: EeiKnowledgeFeedbackRef): void;
  replaceAll(items: EeiKnowledgeFeedbackRef[]): void;
}

export interface EeiAuditReferenceRepositoryPort {
  list(): EeiAuditReference[];
  save(reference: EeiAuditReference): void;
  replaceAll(references: EeiAuditReference[]): void;
}

export interface EeiPorts {
  experiences: EeiExperienceRepositoryPort;
  knowledgeFeedback: EeiKnowledgeFeedbackRepositoryPort;
  auditReferences: EeiAuditReferenceRepositoryPort;
}

export type PartialEeiPorts = Partial<EeiPorts>;
export type { EeiRegistrySnapshot };
