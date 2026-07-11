/**
 * Enterprise Financial Operations Engine (EFOE) — Sprint 12 Foundation.
 *
 * Canonical operational financial domain. NOT accounting. Business-agnostic.
 */

// ---------------------------------------------------------------------------
// Lifecycle & status
// ---------------------------------------------------------------------------

export type EfoeDisbursementStatus =
  | "not_disbursed"
  | "partially_disbursed"
  | "fully_disbursed";

export type EfoeInvoiceLifecycleStatus =
  | "draft"
  | "issued"
  | "paid"
  | "cancelled"
  | "void";

export type EfoeRevenueRecognitionStatus =
  | "pending"
  | "recognized"
  | "reversed";

export type EfoeSettlementStatus =
  | "pending"
  | "eligible"
  | "processing"
  | "released"
  | "reversed"
  | "blocked";

export type EfoeDistributionStatus =
  | "pending"
  | "allocated"
  | "distributed"
  | "reversed";

export type EfoeClawbackStrategy =
  | "recover_immediately"
  | "recover_from_future_settlement"
  | "company_absorbs"
  | "manual_recovery"
  | "write_off";

export type EfoeInvoicePayeeType =
  | "bank"
  | "nbfc"
  | "builder"
  | "corporate"
  | "individual"
  | "registered_organization";

export type EfoeBeneficiaryType =
  | "company"
  | "employee"
  | "relationship_manager"
  | "wealth_partner"
  | "ca"
  | "builder"
  | "vendor"
  | "partner"
  | "custom";

export type EfoeSettlementRequirementCode =
  | "pan"
  | "aadhaar"
  | "bank_details"
  | "cancelled_cheque"
  | "kyc"
  | "tds"
  | "gst"
  | "signed_agreement"
  | "address_proof"
  | "mobile_verification"
  | "email_verification"
  | string;

export type EfoeFinancialTimelineEventType =
  | "revenue_event"
  | "invoice_issued"
  | "payment_received"
  | "revenue_recognized"
  | "distribution_allocated"
  | "settlement_released"
  | "settlement_blocked"
  | "clawback_applied"
  | "recovery_recorded"
  | "adjustment_applied";

export type EfoeAuditEntityType =
  | "revenue_event"
  | "invoice"
  | "revenue_recognition"
  | "distribution"
  | "settlement"
  | "settlement_batch"
  | "beneficiary"
  | "clawback"
  | "recovery"
  | "adjustment"
  | "settlement_profile";

// ---------------------------------------------------------------------------
// Disbursement (system-derived)
// ---------------------------------------------------------------------------

export interface EfoeDisbursementSnapshot {
  transactionRef: string;
  finalLoanAmount: number;
  totalDisbursed: number;
  pendingDisbursement: number;
  disbursementPercent: number;
  disbursementStatus: EfoeDisbursementStatus;
  invoiceEligibleAmount: number;
  totalInvoicedAmount: number;
  remainingInvoiceEligible: number;
  derivedOn: string;
}

// ---------------------------------------------------------------------------
// Revenue & invoice
// ---------------------------------------------------------------------------

export interface EfoeRevenueEvent {
  id: string;
  eventCode: string;
  transactionRef: string;
  eventType: string;
  amount: number;
  currencyCode: string;
  tenantId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EfoeInvoicePayee {
  id: string;
  payeeType: EfoeInvoicePayeeType;
  payeeName: string;
  payeeRef: string;
  enabled: boolean;
}

export interface EfoeInvoiceLine {
  id: string;
  invoiceId: string;
  lineCode: string;
  description: string;
  amount: number;
  quantity: number;
  unitPrice: number;
}

export interface EfoeInvoice {
  id: string;
  invoiceCode: string;
  transactionRef: string;
  revenueEventId?: string;
  payeeId: string;
  payeeType: EfoeInvoicePayeeType;
  lifecycleStatus: EfoeInvoiceLifecycleStatus;
  disbursementBasisAmount: number;
  invoiceAmount: number;
  currencyCode: string;
  issuedOn?: string;
  paidOn?: string;
  tenantId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EfoeInvoiceSchedule {
  id: string;
  transactionRef: string;
  scheduleCode: string;
  trancheNumber: number;
  scheduledAmount: number;
  scheduledOn: string;
  invoiceId?: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EfoeRevenueReceipt {
  id: string;
  invoiceId: string;
  receiptCode: string;
  amount: number;
  currencyCode: string;
  receivedOn: string;
  paymentRefId?: string;
  createdBy: string;
  createdOn: string;
}

export interface EfoeRevenueRecognition {
  id: string;
  revenueEventId: string;
  invoiceId: string;
  receiptId: string;
  recognizedAmount: number;
  currencyCode: string;
  status: EfoeRevenueRecognitionStatus;
  recognizedOn: string;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

export interface EfoeDistributionRuleReference {
  id: string;
  ruleCode: string;
  ruleRef: string;
  description: string;
  enabled: boolean;
}

export interface EfoeBeneficiary {
  id: string;
  beneficiaryCode: string;
  beneficiaryName: string;
  beneficiaryType: EfoeBeneficiaryType;
  beneficiaryRef: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EfoeRevenueDistribution {
  id: string;
  recognitionId: string;
  beneficiaryId: string;
  beneficiaryCode: string;
  distributionRuleRefId?: string;
  allocatedAmount: number;
  allocatedPercent: number;
  currencyCode: string;
  status: EfoeDistributionStatus;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

export interface EfoeSettlementRequirement {
  id: string;
  profileId: string;
  requirementCode: EfoeSettlementRequirementCode;
  requirementName: string;
  mandatory: boolean;
  enabled: boolean;
}

export interface EfoeSettlementProfile {
  id: string;
  profileCode: string;
  profileName: string;
  description: string;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EfoeSettlementEligibility {
  id: string;
  beneficiaryId: string;
  profileId: string;
  satisfied: boolean;
  satisfiedRequirements: string[];
  pendingRequirements: string[];
  evaluatedOn: string;
}

export interface EfoeSettlementOverride {
  id: string;
  settlementId: string;
  overrideReason: string;
  overriddenBy: string;
  overriddenOn: string;
}

export interface EfoeSettlement {
  id: string;
  settlementCode: string;
  beneficiaryId: string;
  distributionId?: string;
  batchId?: string;
  amount: number;
  currencyCode: string;
  status: EfoeSettlementStatus;
  isPartial: boolean;
  isAdvance: boolean;
  releasedOn?: string;
  createdBy: string;
  createdOn: string;
}

export interface EfoeSettlementBatch {
  id: string;
  batchCode: string;
  description: string;
  totalAmount: number;
  currencyCode: string;
  status: EfoeSettlementStatus;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Adjustments, clawbacks, recovery
// ---------------------------------------------------------------------------

export interface EfoeAdjustment {
  id: string;
  adjustmentCode: string;
  transactionRef: string;
  adjustmentType: string;
  amount: number;
  currencyCode: string;
  reason: string;
  createdBy: string;
  createdOn: string;
}

export interface EfoeClawback {
  id: string;
  clawbackCode: string;
  transactionRef: string;
  recognitionId?: string;
  distributionId?: string;
  amount: number;
  currencyCode: string;
  strategy: EfoeClawbackStrategy;
  status: "pending" | "applied" | "recovered" | "written_off";
  createdBy: string;
  createdOn: string;
}

export interface EfoeRecovery {
  id: string;
  clawbackId: string;
  recoveryCode: string;
  amount: number;
  currencyCode: string;
  recoveredOn: string;
  createdBy: string;
  createdOn: string;
}

export interface EfoeWriteOff {
  id: string;
  clawbackId: string;
  writeOffCode: string;
  amount: number;
  currencyCode: string;
  reason: string;
  writtenOffOn: string;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// References & incentives
// ---------------------------------------------------------------------------

export interface EfoeFinancialEvent {
  id: string;
  eventCode: string;
  eventType: string;
  transactionRef: string;
  amount: number;
  currencyCode: string;
  occurredOn: string;
  createdBy: string;
}

export interface EfoePaymentReference {
  id: string;
  receiptId: string;
  paymentRef: string;
  paymentMethod: string;
  verifiedOn?: string;
}

export interface EfoeGstReference {
  id: string;
  entityRef: string;
  gstRef: string;
  gstNumber?: string;
  status: "pending" | "verified";
}

export interface EfoeTdsReference {
  id: string;
  entityRef: string;
  tdsRef: string;
  tdsRate?: number;
  status: "pending" | "verified";
}

export interface EfoeIncentive {
  id: string;
  incentiveCode: string;
  beneficiaryId: string;
  amount: number;
  currencyCode: string;
  eligibleOn: string;
  status: "pending" | "eligible" | "paid";
}

export interface EfoeContest {
  id: string;
  contestCode: string;
  contestName: string;
  startOn: string;
  endOn: string;
  enabled: boolean;
}

export interface EfoeBonus {
  id: string;
  bonusCode: string;
  beneficiaryId: string;
  contestId?: string;
  amount: number;
  currencyCode: string;
  status: "pending" | "eligible" | "paid";
}

// ---------------------------------------------------------------------------
// Partner financial visibility
// ---------------------------------------------------------------------------

export interface EfoePartnerFinancialVisibility {
  partnerRef: string;
  revenuePending: number;
  revenueRecognized: number;
  revenueUnderSettlement: number;
  settlementReleased: number;
  settlementPending: number;
  agreementStatus: string;
  pendingDocuments: string[];
  contestProgress?: Record<string, unknown>;
  bonusEligibility: boolean;
  computedOn: string;
}

export interface EfoeFinancialTimelineEntry {
  id: string;
  transactionRef: string;
  eventType: EfoeFinancialTimelineEventType;
  title: string;
  description: string;
  actorId: string;
  occurredOn: string;
  metadata?: Record<string, unknown>;
}

export interface EfoeFinancialAuditReference {
  id: string;
  entityId: string;
  entityType: EfoeAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EfoeValidationSeverity = "error" | "warning";

export interface EfoeValidationIssue {
  code: string;
  severity: EfoeValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EfoeValidationResult {
  valid: boolean;
  issues: EfoeValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EfoeRegistrySnapshot {
  revenueEvents: EfoeRevenueEvent[];
  invoices: EfoeInvoice[];
  invoiceLines: EfoeInvoiceLine[];
  invoiceSchedules: EfoeInvoiceSchedule[];
  invoicePayees: EfoeInvoicePayee[];
  revenueReceipts: EfoeRevenueReceipt[];
  revenueRecognitions: EfoeRevenueRecognition[];
  distributionRules: EfoeDistributionRuleReference[];
  beneficiaries: EfoeBeneficiary[];
  distributions: EfoeRevenueDistribution[];
  settlementProfiles: EfoeSettlementProfile[];
  settlementRequirements: EfoeSettlementRequirement[];
  settlementEligibilities: EfoeSettlementEligibility[];
  settlements: EfoeSettlement[];
  settlementBatches: EfoeSettlementBatch[];
  settlementOverrides: EfoeSettlementOverride[];
  adjustments: EfoeAdjustment[];
  clawbacks: EfoeClawback[];
  recoveries: EfoeRecovery[];
  writeOffs: EfoeWriteOff[];
  financialEvents: EfoeFinancialEvent[];
  paymentReferences: EfoePaymentReference[];
  gstReferences: EfoeGstReference[];
  tdsReferences: EfoeTdsReference[];
  incentives: EfoeIncentive[];
  contests: EfoeContest[];
  bonuses: EfoeBonus[];
  timelineEntries: EfoeFinancialTimelineEntry[];
  auditReferences: EfoeFinancialAuditReference[];
}
