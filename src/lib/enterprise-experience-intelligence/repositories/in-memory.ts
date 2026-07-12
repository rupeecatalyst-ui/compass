/**
 * EEI in-memory adapters.
 */

import type {
  EeiAuditReference,
  EeiExperienceRecord,
  EeiKnowledgeFeedbackRef,
} from "@/types/enterprise-experience-intelligence";
import type { EeiPorts } from "@/types/enterprise-experience-intelligence-ports";

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

export function createInMemoryEeiPorts(): EeiPorts {
  const experiences = createMutableListStore<EeiExperienceRecord>();
  const knowledgeFeedback = createMutableListStore<EeiKnowledgeFeedbackRef>();
  const auditReferences = createMutableListStore<EeiAuditReference>();

  return {
    experiences: {
      list: () => experiences.list(),
      findById: (id) => experiences.list().find((e) => e.experienceId === id),
      findByAdvisoryId: (advisoryId) =>
        experiences.list().find((e) => e.advisoryId === advisoryId),
      findByDecisionId: (decisionId) =>
        experiences.list().find((e) => e.decisionId === decisionId),
      listByOpportunity: (opportunityId) =>
        experiences.list().filter((e) => e.opportunityId === opportunityId),
      save: (r) => experiences.upsert(r, (i) => i.experienceId),
      replaceAll: (items) => experiences.replaceAll(items),
    },
    knowledgeFeedback: {
      list: () => knowledgeFeedback.list(),
      findById: (id) => knowledgeFeedback.list().find((f) => f.feedbackId === id),
      listByExperience: (experienceId) =>
        knowledgeFeedback.list().filter((f) => f.experienceId === experienceId),
      save: (f) => knowledgeFeedback.upsert(f, (i) => i.feedbackId),
      replaceAll: (items) => knowledgeFeedback.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
