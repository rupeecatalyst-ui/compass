/**
 * EFOE in-memory adapters — Sprint 12 default implementation.
 */

import type {
  EfoeAdjustment,
  EfoeBeneficiary,
  EfoeBonus,
  EfoeClawback,
  EfoeContest,
  EfoeDistributionRuleReference,
  EfoeFinancialAuditReference,
  EfoeFinancialEvent,
  EfoeFinancialTimelineEntry,
  EfoeGstReference,
  EfoeIncentive,
  EfoeInvoice,
  EfoeInvoiceLine,
  EfoeInvoicePayee,
  EfoeInvoiceSchedule,
  EfoePaymentReference,
  EfoeRecovery,
  EfoeRevenueDistribution,
  EfoeRevenueEvent,
  EfoeRevenueReceipt,
  EfoeRevenueRecognition,
  EfoeSettlement,
  EfoeSettlementBatch,
  EfoeSettlementEligibility,
  EfoeSettlementOverride,
  EfoeSettlementProfile,
  EfoeSettlementRequirement,
  EfoeTdsReference,
  EfoeWriteOff,
} from "@/types/enterprise-financial-operations-engine";
import type { EfoePorts } from "@/types/enterprise-financial-operations-engine-ports";

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

export function createInMemoryEfoePorts(): EfoePorts {
  const revenueEvents = createMutableListStore<EfoeRevenueEvent>();
  const invoicePayees = createMutableListStore<EfoeInvoicePayee>();
  const invoices = createMutableListStore<EfoeInvoice>();
  const invoiceLines = createMutableListStore<EfoeInvoiceLine>();
  const invoiceSchedules = createMutableListStore<EfoeInvoiceSchedule>();
  const revenueReceipts = createMutableListStore<EfoeRevenueReceipt>();
  const revenueRecognitions = createMutableListStore<EfoeRevenueRecognition>();
  const distributionRules = createMutableListStore<EfoeDistributionRuleReference>();
  const beneficiaries = createMutableListStore<EfoeBeneficiary>();
  const distributions = createMutableListStore<EfoeRevenueDistribution>();
  const settlementProfiles = createMutableListStore<EfoeSettlementProfile>();
  const settlementRequirements = createMutableListStore<EfoeSettlementRequirement>();
  const settlementEligibilities = createMutableListStore<EfoeSettlementEligibility>();
  const settlements = createMutableListStore<EfoeSettlement>();
  const settlementBatches = createMutableListStore<EfoeSettlementBatch>();
  const settlementOverrides = createMutableListStore<EfoeSettlementOverride>();
  const adjustments = createMutableListStore<EfoeAdjustment>();
  const clawbacks = createMutableListStore<EfoeClawback>();
  const recoveries = createMutableListStore<EfoeRecovery>();
  const writeOffs = createMutableListStore<EfoeWriteOff>();
  const financialEvents = createMutableListStore<EfoeFinancialEvent>();
  const paymentReferences = createMutableListStore<EfoePaymentReference>();
  const gstReferences = createMutableListStore<EfoeGstReference>();
  const tdsReferences = createMutableListStore<EfoeTdsReference>();
  const incentives = createMutableListStore<EfoeIncentive>();
  const contests = createMutableListStore<EfoeContest>();
  const bonuses = createMutableListStore<EfoeBonus>();
  const timeline = createMutableListStore<EfoeFinancialTimelineEntry>();
  const auditReferences = createMutableListStore<EfoeFinancialAuditReference>();

  return {
    revenueEvents: {
      list: () => revenueEvents.list(),
      findById: (id) => revenueEvents.list().find((e) => e.id === id),
      findByCode: (eventCode) => revenueEvents.list().find((e) => e.eventCode === eventCode),
      listByTransaction: (transactionRef) =>
        revenueEvents.list().filter((e) => e.transactionRef === transactionRef),
      save: (event) => revenueEvents.upsert(event, (e) => e.id),
      replaceAll: (items) => revenueEvents.replaceAll(items),
    },
    invoicePayees: {
      list: () => invoicePayees.list(),
      findById: (id) => invoicePayees.list().find((p) => p.id === id),
      save: (payee) => invoicePayees.upsert(payee, (p) => p.id),
      replaceAll: (items) => invoicePayees.replaceAll(items),
    },
    invoices: {
      list: () => invoices.list(),
      findById: (id) => invoices.list().find((i) => i.id === id),
      findByCode: (invoiceCode) => invoices.list().find((i) => i.invoiceCode === invoiceCode),
      listByTransaction: (transactionRef) =>
        invoices.list().filter((i) => i.transactionRef === transactionRef),
      save: (invoice) => invoices.upsert(invoice, (i) => i.id),
      replaceAll: (items) => invoices.replaceAll(items),
    },
    invoiceLines: {
      list: () => invoiceLines.list(),
      listByInvoice: (invoiceId) => invoiceLines.list().filter((l) => l.invoiceId === invoiceId),
      save: (line) => invoiceLines.upsert(line, (l) => l.id),
      replaceAll: (items) => invoiceLines.replaceAll(items),
    },
    invoiceSchedules: {
      list: () => invoiceSchedules.list(),
      listByTransaction: (transactionRef) =>
        invoiceSchedules.list().filter((s) => s.transactionRef === transactionRef),
      save: (schedule) => invoiceSchedules.upsert(schedule, (s) => s.id),
      replaceAll: (items) => invoiceSchedules.replaceAll(items),
    },
    revenueReceipts: {
      list: () => revenueReceipts.list(),
      findById: (id) => revenueReceipts.list().find((r) => r.id === id),
      listByInvoice: (invoiceId) => revenueReceipts.list().filter((r) => r.invoiceId === invoiceId),
      save: (receipt) => revenueReceipts.upsert(receipt, (r) => r.id),
      replaceAll: (items) => revenueReceipts.replaceAll(items),
    },
    revenueRecognitions: {
      list: () => revenueRecognitions.list(),
      findById: (id) => revenueRecognitions.list().find((r) => r.id === id),
      listByInvoice: (invoiceId) =>
        revenueRecognitions.list().filter((r) => r.invoiceId === invoiceId),
      save: (recognition) => revenueRecognitions.upsert(recognition, (r) => r.id),
      replaceAll: (items) => revenueRecognitions.replaceAll(items),
    },
    distributionRules: {
      list: () => distributionRules.list(),
      findByCode: (ruleCode) => distributionRules.list().find((r) => r.ruleCode === ruleCode),
      save: (rule) => distributionRules.upsert(rule, (r) => r.id),
      replaceAll: (items) => distributionRules.replaceAll(items),
    },
    beneficiaries: {
      list: () => beneficiaries.list(),
      findById: (id) => beneficiaries.list().find((b) => b.id === id),
      findByCode: (beneficiaryCode) =>
        beneficiaries.list().find((b) => b.beneficiaryCode === beneficiaryCode),
      save: (beneficiary) => beneficiaries.upsert(beneficiary, (b) => b.id),
      replaceAll: (items) => beneficiaries.replaceAll(items),
    },
    distributions: {
      list: () => distributions.list(),
      findById: (id) => distributions.list().find((d) => d.id === id),
      listByRecognition: (recognitionId) =>
        distributions.list().filter((d) => d.recognitionId === recognitionId),
      listByBeneficiary: (beneficiaryId) =>
        distributions.list().filter((d) => d.beneficiaryId === beneficiaryId),
      save: (distribution) => distributions.upsert(distribution, (d) => d.id),
      replaceAll: (items) => distributions.replaceAll(items),
    },
    settlementProfiles: {
      list: () => settlementProfiles.list(),
      findById: (id) => settlementProfiles.list().find((p) => p.id === id),
      findByCode: (profileCode) =>
        settlementProfiles.list().find((p) => p.profileCode === profileCode && p.enabled),
      save: (profile) => settlementProfiles.upsert(profile, (p) => p.id),
      replaceAll: (items) => settlementProfiles.replaceAll(items),
    },
    settlementRequirements: {
      list: () => settlementRequirements.list(),
      listByProfile: (profileId) =>
        settlementRequirements.list().filter((r) => r.profileId === profileId),
      save: (requirement) => settlementRequirements.upsert(requirement, (r) => r.id),
      replaceAll: (items) => settlementRequirements.replaceAll(items),
    },
    settlementEligibilities: {
      list: () => settlementEligibilities.list(),
      findByBeneficiary: (beneficiaryId) =>
        settlementEligibilities.list().find((e) => e.beneficiaryId === beneficiaryId),
      save: (eligibility) => settlementEligibilities.upsert(eligibility, (e) => e.id),
      replaceAll: (items) => settlementEligibilities.replaceAll(items),
    },
    settlements: {
      list: () => settlements.list(),
      findById: (id) => settlements.list().find((s) => s.id === id),
      findByCode: (settlementCode) => settlements.list().find((s) => s.settlementCode === settlementCode),
      listByBeneficiary: (beneficiaryId) =>
        settlements.list().filter((s) => s.beneficiaryId === beneficiaryId),
      save: (settlement) => settlements.upsert(settlement, (s) => s.id),
      replaceAll: (items) => settlements.replaceAll(items),
    },
    settlementBatches: {
      list: () => settlementBatches.list(),
      findById: (id) => settlementBatches.list().find((b) => b.id === id),
      findByCode: (batchCode) => settlementBatches.list().find((b) => b.batchCode === batchCode),
      save: (batch) => settlementBatches.upsert(batch, (b) => b.id),
      replaceAll: (items) => settlementBatches.replaceAll(items),
    },
    settlementOverrides: {
      list: () => settlementOverrides.list(),
      listBySettlement: (settlementId) =>
        settlementOverrides.list().filter((o) => o.settlementId === settlementId),
      save: (override) => settlementOverrides.upsert(override, (o) => o.id),
      replaceAll: (items) => settlementOverrides.replaceAll(items),
    },
    adjustments: {
      list: () => adjustments.list(),
      findByCode: (adjustmentCode) => adjustments.list().find((a) => a.adjustmentCode === adjustmentCode),
      save: (adjustment) => adjustments.upsert(adjustment, (a) => a.id),
      replaceAll: (items) => adjustments.replaceAll(items),
    },
    clawbacks: {
      list: () => clawbacks.list(),
      findById: (id) => clawbacks.list().find((c) => c.id === id),
      findByCode: (clawbackCode) => clawbacks.list().find((c) => c.clawbackCode === clawbackCode),
      save: (clawback) => clawbacks.upsert(clawback, (c) => c.id),
      replaceAll: (items) => clawbacks.replaceAll(items),
    },
    recoveries: {
      list: () => recoveries.list(),
      listByClawback: (clawbackId) => recoveries.list().filter((r) => r.clawbackId === clawbackId),
      save: (recovery) => recoveries.upsert(recovery, (r) => r.id),
      replaceAll: (items) => recoveries.replaceAll(items),
    },
    writeOffs: {
      list: () => writeOffs.list(),
      listByClawback: (clawbackId) => writeOffs.list().filter((w) => w.clawbackId === clawbackId),
      save: (writeOff) => writeOffs.upsert(writeOff, (w) => w.id),
      replaceAll: (items) => writeOffs.replaceAll(items),
    },
    financialEvents: {
      list: () => financialEvents.list(),
      listByTransaction: (transactionRef) =>
        financialEvents.list().filter((e) => e.transactionRef === transactionRef),
      save: (event) => financialEvents.upsert(event, (e) => e.id),
      replaceAll: (items) => financialEvents.replaceAll(items),
    },
    paymentReferences: {
      list: () => paymentReferences.list(),
      save: (reference) => paymentReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => paymentReferences.replaceAll(items),
    },
    gstReferences: {
      list: () => gstReferences.list(),
      save: (reference) => gstReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => gstReferences.replaceAll(items),
    },
    tdsReferences: {
      list: () => tdsReferences.list(),
      save: (reference) => tdsReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => tdsReferences.replaceAll(items),
    },
    incentives: {
      list: () => incentives.list(),
      listByBeneficiary: (beneficiaryId) =>
        incentives.list().filter((i) => i.beneficiaryId === beneficiaryId),
      save: (incentive) => incentives.upsert(incentive, (i) => i.id),
      replaceAll: (items) => incentives.replaceAll(items),
    },
    contests: {
      list: () => contests.list(),
      findByCode: (contestCode) => contests.list().find((c) => c.contestCode === contestCode),
      save: (contest) => contests.upsert(contest, (c) => c.id),
      replaceAll: (items) => contests.replaceAll(items),
    },
    bonuses: {
      list: () => bonuses.list(),
      listByBeneficiary: (beneficiaryId) =>
        bonuses.list().filter((b) => b.beneficiaryId === beneficiaryId),
      save: (bonus) => bonuses.upsert(bonus, (b) => b.id),
      replaceAll: (items) => bonuses.replaceAll(items),
    },
    timeline: {
      list: () => timeline.list(),
      listByTransaction: (transactionRef) =>
        timeline.list().filter((e) => e.transactionRef === transactionRef),
      save: (entry) => timeline.upsert(entry, (e) => e.id),
      replaceAll: (items) => timeline.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) => auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
