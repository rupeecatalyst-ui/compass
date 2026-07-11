/**
 * EOLE in-memory repository adapters.
 */

import type {
  EoleOpportunity,
  EoleOpportunityAging,
  EoleOpportunityAgingPolicy,
  EoleOpportunityAssignment,
  EoleOpportunityAuditReference,
  EoleOpportunityCustomerReference,
  EoleOpportunityExecutor,
  EoleOpportunityFinancialRequirement,
  EoleOpportunityHold,
  EoleOpportunityLenderReference,
  EoleOpportunityLifecycle,
  EoleOpportunityOrganizationReference,
  EoleOpportunityOwner,
  EoleOpportunityPartnerReference,
  EoleOpportunityPipeline,
  EoleOpportunityPipelineSnapshot,
  EoleOpportunityProductReference,
  EoleOpportunityProfile,
  EoleOpportunityRequirement,
  EoleOpportunitySla,
  EoleOpportunityStage,
  EoleOpportunityStrategy,
  EoleOpportunitySubStage,
  EoleOpportunityTimelineEntry,
} from "@/types/enterprise-opportunity-lifecycle-engine";
import type { EolePorts } from "@/types/enterprise-opportunity-lifecycle-engine-ports";

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

export function createInMemoryEolePorts(): EolePorts {
  const opportunities = createMutableListStore<EoleOpportunity>();
  const profiles = createMutableListStore<EoleOpportunityProfile>();
  const requirements = createMutableListStore<EoleOpportunityRequirement>();
  const owners = createMutableListStore<EoleOpportunityOwner>();
  const executors = createMutableListStore<EoleOpportunityExecutor>();
  const assignments = createMutableListStore<EoleOpportunityAssignment>();
  const customerReferences = createMutableListStore<EoleOpportunityCustomerReference>();
  const partnerReferences = createMutableListStore<EoleOpportunityPartnerReference>();
  const organizationReferences = createMutableListStore<EoleOpportunityOrganizationReference>();
  const productReferences = createMutableListStore<EoleOpportunityProductReference>();
  const financialRequirements = createMutableListStore<EoleOpportunityFinancialRequirement>();
  const lifecycles = createMutableListStore<EoleOpportunityLifecycle>();
  const stages = createMutableListStore<EoleOpportunityStage>();
  const subStages = createMutableListStore<EoleOpportunitySubStage>();
  const pipelines = createMutableListStore<EoleOpportunityPipeline>();
  const pipelineSnapshots = createMutableListStore<EoleOpportunityPipelineSnapshot>();
  const lenderReferences = createMutableListStore<EoleOpportunityLenderReference>();
  const strategies = createMutableListStore<EoleOpportunityStrategy>();
  const holds = createMutableListStore<EoleOpportunityHold>();
  const agingPolicies = createMutableListStore<EoleOpportunityAgingPolicy>();
  const agings = createMutableListStore<EoleOpportunityAging>();
  const slas = createMutableListStore<EoleOpportunitySla>();
  const timeline = createMutableListStore<EoleOpportunityTimelineEntry>();
  const auditReferences = createMutableListStore<EoleOpportunityAuditReference>();

  return {
    opportunities: {
      list: () => opportunities.list(),
      findById: (id) => opportunities.list().find((o) => o.id === id),
      findByCode: (code) => opportunities.list().find((o) => o.opportunityCode === code),
      findByEnterpriseId: (eid) => opportunities.list().find((o) => o.enterpriseOpportunityId === eid),
      listByCustomer: (customerRef) => opportunities.list().filter((o) => o.customerRef === customerRef),
      save: (o) => opportunities.upsert(o, (i) => i.id),
      replaceAll: (items) => opportunities.replaceAll(items),
    },
    profiles: {
      list: () => profiles.list(),
      listByOpportunity: (oid) => profiles.list().filter((p) => p.opportunityId === oid),
      save: (p) => profiles.upsert(p, (i) => i.id),
      replaceAll: (items) => profiles.replaceAll(items),
    },
    requirements: {
      list: () => requirements.list(),
      listByOpportunity: (oid) => requirements.list().filter((r) => r.opportunityId === oid),
      save: (r) => requirements.upsert(r, (i) => i.id),
      replaceAll: (items) => requirements.replaceAll(items),
    },
    owners: {
      list: () => owners.list(),
      listByOpportunity: (oid) => owners.list().filter((o) => o.opportunityId === oid),
      findSourceOwner: (oid) => owners.list().find((o) => o.opportunityId === oid && o.isSourceOwner),
      save: (o) => owners.upsert(o, (i) => i.id),
      replaceAll: (items) => owners.replaceAll(items),
    },
    executors: {
      list: () => executors.list(),
      listByOpportunity: (oid) => executors.list().filter((e) => e.opportunityId === oid),
      listActiveByOpportunity: (oid) =>
        executors.list().filter((e) => e.opportunityId === oid && e.active),
      save: (e) => executors.upsert(e, (i) => i.id),
      replaceAll: (items) => executors.replaceAll(items),
    },
    assignments: {
      list: () => assignments.list(),
      listByOpportunity: (oid) => assignments.list().filter((a) => a.opportunityId === oid),
      save: (a) => assignments.upsert(a, (i) => i.id),
      replaceAll: (items) => assignments.replaceAll(items),
    },
    customerReferences: {
      list: () => customerReferences.list(),
      listByOpportunity: (oid) => customerReferences.list().filter((r) => r.opportunityId === oid),
      save: (r) => customerReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => customerReferences.replaceAll(items),
    },
    partnerReferences: {
      list: () => partnerReferences.list(),
      listByOpportunity: (oid) => partnerReferences.list().filter((r) => r.opportunityId === oid),
      save: (r) => partnerReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => partnerReferences.replaceAll(items),
    },
    organizationReferences: {
      list: () => organizationReferences.list(),
      listByOpportunity: (oid) => organizationReferences.list().filter((r) => r.opportunityId === oid),
      save: (r) => organizationReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => organizationReferences.replaceAll(items),
    },
    productReferences: {
      list: () => productReferences.list(),
      listByOpportunity: (oid) => productReferences.list().filter((r) => r.opportunityId === oid),
      save: (r) => productReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => productReferences.replaceAll(items),
    },
    financialRequirements: {
      list: () => financialRequirements.list(),
      listByOpportunity: (oid) => financialRequirements.list().filter((r) => r.opportunityId === oid),
      save: (r) => financialRequirements.upsert(r, (i) => i.id),
      replaceAll: (items) => financialRequirements.replaceAll(items),
    },
    lifecycles: {
      list: () => lifecycles.list(),
      listByOpportunity: (oid) => lifecycles.list().filter((l) => l.opportunityId === oid),
      save: (l) => lifecycles.upsert(l, (i) => i.id),
      replaceAll: (items) => lifecycles.replaceAll(items),
    },
    stages: {
      list: () => stages.list(),
      findByCode: (code) => stages.list().find((s) => s.stageCode === code),
      save: (s) => stages.upsert(s, (i) => i.id),
      replaceAll: (items) => stages.replaceAll(items),
    },
    subStages: {
      list: () => subStages.list(),
      findByCode: (stageCode, subStageCode) =>
        subStages.list().find((s) => s.stageCode === stageCode && s.subStageCode === subStageCode),
      listByStage: (stageCode) => subStages.list().filter((s) => s.stageCode === stageCode),
      save: (s) => subStages.upsert(s, (i) => i.id),
      replaceAll: (items) => subStages.replaceAll(items),
    },
    pipelines: {
      list: () => pipelines.list(),
      findById: (id) => pipelines.list().find((p) => p.id === id),
      listByOpportunity: (oid) => pipelines.list().filter((p) => p.opportunityId === oid),
      save: (p) => pipelines.upsert(p, (i) => i.id),
      replaceAll: (items) => pipelines.replaceAll(items),
    },
    pipelineSnapshots: {
      list: () => pipelineSnapshots.list(),
      listByPipeline: (pid) => pipelineSnapshots.list().filter((s) => s.pipelineId === pid),
      save: (s) => pipelineSnapshots.upsert(s, (i) => i.id),
      replaceAll: (items) => pipelineSnapshots.replaceAll(items),
    },
    lenderReferences: {
      list: () => lenderReferences.list(),
      listByOpportunity: (oid) => lenderReferences.list().filter((r) => r.opportunityId === oid),
      listByPipeline: (pid) => lenderReferences.list().filter((r) => r.pipelineId === pid),
      save: (r) => lenderReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => lenderReferences.replaceAll(items),
    },
    strategies: {
      list: () => strategies.list(),
      listByOpportunity: (oid) => strategies.list().filter((s) => s.opportunityId === oid),
      save: (s) => strategies.upsert(s, (i) => i.id),
      replaceAll: (items) => strategies.replaceAll(items),
    },
    holds: {
      list: () => holds.list(),
      listByOpportunity: (oid) => holds.list().filter((h) => h.opportunityId === oid),
      findActiveByOpportunity: (oid) =>
        holds.list().find((h) => h.opportunityId === oid && h.status === "active"),
      save: (h) => holds.upsert(h, (i) => i.id),
      replaceAll: (items) => holds.replaceAll(items),
    },
    agingPolicies: {
      list: () => agingPolicies.list(),
      findByCode: (code) => agingPolicies.list().find((p) => p.policyCode === code),
      findByStage: (stageCode) => agingPolicies.list().find((p) => p.stageCode === stageCode),
      save: (p) => agingPolicies.upsert(p, (i) => i.id),
      replaceAll: (items) => agingPolicies.replaceAll(items),
    },
    agings: {
      list: () => agings.list(),
      listByOpportunity: (oid) => agings.list().filter((a) => a.opportunityId === oid),
      save: (a) => agings.upsert(a, (i) => i.id),
      replaceAll: (items) => agings.replaceAll(items),
    },
    slas: {
      list: () => slas.list(),
      listByOpportunity: (oid) => slas.list().filter((s) => s.opportunityId === oid),
      save: (s) => slas.upsert(s, (i) => i.id),
      replaceAll: (items) => slas.replaceAll(items),
    },
    timeline: {
      list: () => timeline.list(),
      listByOpportunity: (oid) => timeline.list().filter((t) => t.opportunityId === oid),
      save: (t) => timeline.upsert(t, (i) => i.id),
      replaceAll: (items) => timeline.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      save: (r) => auditReferences.upsert(r, (i) => i.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
