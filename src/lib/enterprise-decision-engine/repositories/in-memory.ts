/**
 * EDE in-memory adapters (DKF packages + ERE reasoning traces).
 */

import type {
  DkfKnowledgePackage,
  EdeAuditReference,
  EdeDecisionHistoryEntry,
  EdeDecisionRequest,
  EdeDecisionResponse,
  EreReasoningTrace,
} from "@/types/enterprise-decision-engine";
import type { EdePorts } from "@/types/enterprise-decision-engine-ports";

function createMutableListStore<T>() {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next: T[]) => {
      items = next;
    },
    upsert: (item: T, key: (item: T) => string) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
  };
}

export function createInMemoryEdePorts(): EdePorts {
  const requests = createMutableListStore<EdeDecisionRequest>();
  const responses = createMutableListStore<EdeDecisionResponse>();
  const history = createMutableListStore<EdeDecisionHistoryEntry>();
  const knowledgePackages = createMutableListStore<DkfKnowledgePackage>();
  const reasoningTraces = createMutableListStore<EreReasoningTrace>();
  const auditReferences = createMutableListStore<EdeAuditReference>();

  return {
    requests: {
      list: () => requests.list(),
      findById: (id) => requests.list().find((r) => r.id === id),
      save: (r) => requests.upsert(r, (i) => i.id),
      replaceAll: (items) => requests.replaceAll(items),
    },
    responses: {
      list: () => responses.list(),
      findById: (decisionId) => responses.list().find((r) => r.decisionId === decisionId),
      listByOpportunity: (opportunityId) =>
        responses.list().filter((r) => r.opportunityId === opportunityId),
      save: (r) => responses.upsert(r, (i) => i.decisionId),
      replaceAll: (items) => responses.replaceAll(items),
    },
    history: {
      list: () => history.list(),
      listByOpportunity: (opportunityId) =>
        history.list().filter((h) => h.opportunityId === opportunityId),
      save: (e) => history.upsert(e, (i) => i.id),
      replaceAll: (items) => history.replaceAll(items),
    },
    knowledgePackages: {
      list: () => knowledgePackages.list(),
      findById: (knowledgeId) =>
        knowledgePackages.list().find((p) => p.knowledgeId === knowledgeId),
      save: (p) => knowledgePackages.upsert(p, (i) => i.knowledgeId),
      replaceAll: (items) => knowledgePackages.replaceAll(items),
    },
    reasoningTraces: {
      list: () => reasoningTraces.list(),
      findById: (traceId) => reasoningTraces.list().find((t) => t.traceId === traceId),
      listByDecision: (decisionId) =>
        reasoningTraces.list().filter((t) => t.decisionId === decisionId),
      save: (t) => reasoningTraces.upsert(t, (i) => i.traceId),
      replaceAll: (items) => reasoningTraces.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
