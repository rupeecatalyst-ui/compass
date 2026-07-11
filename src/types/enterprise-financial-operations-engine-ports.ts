/**
 * EFOE Ports — repository contracts.
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
  EfoeRegistrySnapshot,
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
} from "./enterprise-financial-operations-engine";

export interface EfoeRevenueEventRepositoryPort {
  list(): EfoeRevenueEvent[];
  findById(id: string): EfoeRevenueEvent | undefined;
  findByCode(eventCode: string): EfoeRevenueEvent | undefined;
  listByTransaction(transactionRef: string): EfoeRevenueEvent[];
  save(event: EfoeRevenueEvent): void;
  replaceAll(events: EfoeRevenueEvent[]): void;
}

export interface EfoeInvoicePayeeRepositoryPort {
  list(): EfoeInvoicePayee[];
  findById(id: string): EfoeInvoicePayee | undefined;
  save(payee: EfoeInvoicePayee): void;
  replaceAll(payees: EfoeInvoicePayee[]): void;
}

export interface EfoeInvoiceRepositoryPort {
  list(): EfoeInvoice[];
  findById(id: string): EfoeInvoice | undefined;
  findByCode(invoiceCode: string): EfoeInvoice | undefined;
  listByTransaction(transactionRef: string): EfoeInvoice[];
  save(invoice: EfoeInvoice): void;
  replaceAll(invoices: EfoeInvoice[]): void;
}

export interface EfoeInvoiceLineRepositoryPort {
  list(): EfoeInvoiceLine[];
  listByInvoice(invoiceId: string): EfoeInvoiceLine[];
  save(line: EfoeInvoiceLine): void;
  replaceAll(lines: EfoeInvoiceLine[]): void;
}

export interface EfoeInvoiceScheduleRepositoryPort {
  list(): EfoeInvoiceSchedule[];
  listByTransaction(transactionRef: string): EfoeInvoiceSchedule[];
  save(schedule: EfoeInvoiceSchedule): void;
  replaceAll(schedules: EfoeInvoiceSchedule[]): void;
}

export interface EfoeRevenueReceiptRepositoryPort {
  list(): EfoeRevenueReceipt[];
  findById(id: string): EfoeRevenueReceipt | undefined;
  listByInvoice(invoiceId: string): EfoeRevenueReceipt[];
  save(receipt: EfoeRevenueReceipt): void;
  replaceAll(receipts: EfoeRevenueReceipt[]): void;
}

export interface EfoeRevenueRecognitionRepositoryPort {
  list(): EfoeRevenueRecognition[];
  findById(id: string): EfoeRevenueRecognition | undefined;
  listByInvoice(invoiceId: string): EfoeRevenueRecognition[];
  save(recognition: EfoeRevenueRecognition): void;
  replaceAll(recognitions: EfoeRevenueRecognition[]): void;
}

export interface EfoeDistributionRuleRepositoryPort {
  list(): EfoeDistributionRuleReference[];
  findByCode(ruleCode: string): EfoeDistributionRuleReference | undefined;
  save(rule: EfoeDistributionRuleReference): void;
  replaceAll(rules: EfoeDistributionRuleReference[]): void;
}

export interface EfoeBeneficiaryRepositoryPort {
  list(): EfoeBeneficiary[];
  findById(id: string): EfoeBeneficiary | undefined;
  findByCode(beneficiaryCode: string): EfoeBeneficiary | undefined;
  save(beneficiary: EfoeBeneficiary): void;
  replaceAll(beneficiaries: EfoeBeneficiary[]): void;
}

export interface EfoeDistributionRepositoryPort {
  list(): EfoeRevenueDistribution[];
  findById(id: string): EfoeRevenueDistribution | undefined;
  listByRecognition(recognitionId: string): EfoeRevenueDistribution[];
  listByBeneficiary(beneficiaryId: string): EfoeRevenueDistribution[];
  save(distribution: EfoeRevenueDistribution): void;
  replaceAll(distributions: EfoeRevenueDistribution[]): void;
}

export interface EfoeSettlementProfileRepositoryPort {
  list(): EfoeSettlementProfile[];
  findById(id: string): EfoeSettlementProfile | undefined;
  findByCode(profileCode: string): EfoeSettlementProfile | undefined;
  save(profile: EfoeSettlementProfile): void;
  replaceAll(profiles: EfoeSettlementProfile[]): void;
}

export interface EfoeSettlementRequirementRepositoryPort {
  list(): EfoeSettlementRequirement[];
  listByProfile(profileId: string): EfoeSettlementRequirement[];
  save(requirement: EfoeSettlementRequirement): void;
  replaceAll(requirements: EfoeSettlementRequirement[]): void;
}

export interface EfoeSettlementEligibilityRepositoryPort {
  list(): EfoeSettlementEligibility[];
  findByBeneficiary(beneficiaryId: string): EfoeSettlementEligibility | undefined;
  save(eligibility: EfoeSettlementEligibility): void;
  replaceAll(eligibilities: EfoeSettlementEligibility[]): void;
}

export interface EfoeSettlementRepositoryPort {
  list(): EfoeSettlement[];
  findById(id: string): EfoeSettlement | undefined;
  findByCode(settlementCode: string): EfoeSettlement | undefined;
  listByBeneficiary(beneficiaryId: string): EfoeSettlement[];
  save(settlement: EfoeSettlement): void;
  replaceAll(settlements: EfoeSettlement[]): void;
}

export interface EfoeSettlementBatchRepositoryPort {
  list(): EfoeSettlementBatch[];
  findById(id: string): EfoeSettlementBatch | undefined;
  findByCode(batchCode: string): EfoeSettlementBatch | undefined;
  save(batch: EfoeSettlementBatch): void;
  replaceAll(batches: EfoeSettlementBatch[]): void;
}

export interface EfoeSettlementOverrideRepositoryPort {
  list(): EfoeSettlementOverride[];
  listBySettlement(settlementId: string): EfoeSettlementOverride[];
  save(override: EfoeSettlementOverride): void;
  replaceAll(overrides: EfoeSettlementOverride[]): void;
}

export interface EfoeAdjustmentRepositoryPort {
  list(): EfoeAdjustment[];
  findByCode(adjustmentCode: string): EfoeAdjustment | undefined;
  save(adjustment: EfoeAdjustment): void;
  replaceAll(adjustments: EfoeAdjustment[]): void;
}

export interface EfoeClawbackRepositoryPort {
  list(): EfoeClawback[];
  findById(id: string): EfoeClawback | undefined;
  findByCode(clawbackCode: string): EfoeClawback | undefined;
  save(clawback: EfoeClawback): void;
  replaceAll(clawbacks: EfoeClawback[]): void;
}

export interface EfoeRecoveryRepositoryPort {
  list(): EfoeRecovery[];
  listByClawback(clawbackId: string): EfoeRecovery[];
  save(recovery: EfoeRecovery): void;
  replaceAll(recoveries: EfoeRecovery[]): void;
}

export interface EfoeWriteOffRepositoryPort {
  list(): EfoeWriteOff[];
  listByClawback(clawbackId: string): EfoeWriteOff[];
  save(writeOff: EfoeWriteOff): void;
  replaceAll(writeOffs: EfoeWriteOff[]): void;
}

export interface EfoeFinancialEventRepositoryPort {
  list(): EfoeFinancialEvent[];
  listByTransaction(transactionRef: string): EfoeFinancialEvent[];
  save(event: EfoeFinancialEvent): void;
  replaceAll(events: EfoeFinancialEvent[]): void;
}

export interface EfoePaymentReferenceRepositoryPort {
  list(): EfoePaymentReference[];
  save(reference: EfoePaymentReference): void;
  replaceAll(references: EfoePaymentReference[]): void;
}

export interface EfoeGstReferenceRepositoryPort {
  list(): EfoeGstReference[];
  save(reference: EfoeGstReference): void;
  replaceAll(references: EfoeGstReference[]): void;
}

export interface EfoeTdsReferenceRepositoryPort {
  list(): EfoeTdsReference[];
  save(reference: EfoeTdsReference): void;
  replaceAll(references: EfoeTdsReference[]): void;
}

export interface EfoeIncentiveRepositoryPort {
  list(): EfoeIncentive[];
  listByBeneficiary(beneficiaryId: string): EfoeIncentive[];
  save(incentive: EfoeIncentive): void;
  replaceAll(incentives: EfoeIncentive[]): void;
}

export interface EfoeContestRepositoryPort {
  list(): EfoeContest[];
  findByCode(contestCode: string): EfoeContest | undefined;
  save(contest: EfoeContest): void;
  replaceAll(contests: EfoeContest[]): void;
}

export interface EfoeBonusRepositoryPort {
  list(): EfoeBonus[];
  listByBeneficiary(beneficiaryId: string): EfoeBonus[];
  save(bonus: EfoeBonus): void;
  replaceAll(bonuses: EfoeBonus[]): void;
}

export interface EfoeTimelineRepositoryPort {
  list(): EfoeFinancialTimelineEntry[];
  listByTransaction(transactionRef: string): EfoeFinancialTimelineEntry[];
  save(entry: EfoeFinancialTimelineEntry): void;
  replaceAll(entries: EfoeFinancialTimelineEntry[]): void;
}

export interface EfoeAuditReferenceRepositoryPort {
  list(): EfoeFinancialAuditReference[];
  listByEntity(entityId: string): EfoeFinancialAuditReference[];
  save(reference: EfoeFinancialAuditReference): void;
  replaceAll(references: EfoeFinancialAuditReference[]): void;
}

export interface EfoePorts {
  revenueEvents: EfoeRevenueEventRepositoryPort;
  invoicePayees: EfoeInvoicePayeeRepositoryPort;
  invoices: EfoeInvoiceRepositoryPort;
  invoiceLines: EfoeInvoiceLineRepositoryPort;
  invoiceSchedules: EfoeInvoiceScheduleRepositoryPort;
  revenueReceipts: EfoeRevenueReceiptRepositoryPort;
  revenueRecognitions: EfoeRevenueRecognitionRepositoryPort;
  distributionRules: EfoeDistributionRuleRepositoryPort;
  beneficiaries: EfoeBeneficiaryRepositoryPort;
  distributions: EfoeDistributionRepositoryPort;
  settlementProfiles: EfoeSettlementProfileRepositoryPort;
  settlementRequirements: EfoeSettlementRequirementRepositoryPort;
  settlementEligibilities: EfoeSettlementEligibilityRepositoryPort;
  settlements: EfoeSettlementRepositoryPort;
  settlementBatches: EfoeSettlementBatchRepositoryPort;
  settlementOverrides: EfoeSettlementOverrideRepositoryPort;
  adjustments: EfoeAdjustmentRepositoryPort;
  clawbacks: EfoeClawbackRepositoryPort;
  recoveries: EfoeRecoveryRepositoryPort;
  writeOffs: EfoeWriteOffRepositoryPort;
  financialEvents: EfoeFinancialEventRepositoryPort;
  paymentReferences: EfoePaymentReferenceRepositoryPort;
  gstReferences: EfoeGstReferenceRepositoryPort;
  tdsReferences: EfoeTdsReferenceRepositoryPort;
  incentives: EfoeIncentiveRepositoryPort;
  contests: EfoeContestRepositoryPort;
  bonuses: EfoeBonusRepositoryPort;
  timeline: EfoeTimelineRepositoryPort;
  auditReferences: EfoeAuditReferenceRepositoryPort;
}

export type PartialEfoePorts = Partial<EfoePorts>;

export type { EfoeRegistrySnapshot };
