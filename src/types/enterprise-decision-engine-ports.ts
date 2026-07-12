/**
 * EDE ports — repository contracts (SPR-006B includes DKF packages).
 */

import type {
  DkfKnowledgePackage,
  EdeAuditReference,
  EdeDecisionHistoryEntry,
  EdeDecisionRequest,
  EdeDecisionResponse,
  EdeRegistrySnapshot,
  EreReasoningTrace,
} from "./enterprise-decision-engine";

export interface EdeRequestRepositoryPort {
  list(): EdeDecisionRequest[];
  findById(id: string): EdeDecisionRequest | undefined;
  save(request: EdeDecisionRequest): void;
  replaceAll(requests: EdeDecisionRequest[]): void;
}

export interface EdeResponseRepositoryPort {
  list(): EdeDecisionResponse[];
  findById(decisionId: string): EdeDecisionResponse | undefined;
  listByOpportunity(opportunityId: string): EdeDecisionResponse[];
  save(response: EdeDecisionResponse): void;
  replaceAll(responses: EdeDecisionResponse[]): void;
}

export interface EdeHistoryRepositoryPort {
  list(): EdeDecisionHistoryEntry[];
  listByOpportunity(opportunityId: string): EdeDecisionHistoryEntry[];
  save(entry: EdeDecisionHistoryEntry): void;
  replaceAll(entries: EdeDecisionHistoryEntry[]): void;
}

export interface DkfKnowledgeRepositoryPort {
  list(): DkfKnowledgePackage[];
  findById(knowledgeId: string): DkfKnowledgePackage | undefined;
  save(pkg: DkfKnowledgePackage): void;
  replaceAll(packages: DkfKnowledgePackage[]): void;
}

export interface EdeAuditReferenceRepositoryPort {
  list(): EdeAuditReference[];
  save(reference: EdeAuditReference): void;
  replaceAll(references: EdeAuditReference[]): void;
}

export interface EreReasoningTraceRepositoryPort {
  list(): EreReasoningTrace[];
  findById(traceId: string): EreReasoningTrace | undefined;
  listByDecision(decisionId: string): EreReasoningTrace[];
  save(trace: EreReasoningTrace): void;
  replaceAll(traces: EreReasoningTrace[]): void;
}

export interface EdePorts {
  requests: EdeRequestRepositoryPort;
  responses: EdeResponseRepositoryPort;
  history: EdeHistoryRepositoryPort;
  knowledgePackages: DkfKnowledgeRepositoryPort;
  reasoningTraces: EreReasoningTraceRepositoryPort;
  auditReferences: EdeAuditReferenceRepositoryPort;
}

export type PartialEdePorts = Partial<EdePorts>;
export type { EdeRegistrySnapshot };
