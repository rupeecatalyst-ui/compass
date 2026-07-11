/**
 * EFOE foundation validation — smoke checks for Sprint 12 deliverable verification.
 */

import {
  EFOE_BENEFICIARY_TYPES,
  EFOE_CLAWBACK_STRATEGIES,
  EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES,
  EFOE_DISBURSEMENT_STATUS,
  EFOE_INVOICE_LIFECYCLE_STATUS,
  EFOE_INVOICE_PAYEE_TYPES,
  EFOE_SETTLEMENT_STATUS,
} from "@/constants/enterprise-financial-operations-engine";
import { registerEfoeAdjustment } from "./adjustment-registry";
import { registerEfoeBeneficiary } from "./beneficiary-registry";
import { applyEfoeClawback, registerEfoeClawback } from "./clawback-registry";
import { resetEfoeComposition } from "./composition";
import { allocateEfoeRevenueDistribution, registerEfoeDistributionRule } from "./distribution-registry";
import { listEfoeTimeline } from "./financial-timeline-registry";
import {
  issueEfoeInvoice,
  recognizeEfoeRevenue,
  recordEfoeRevenueReceipt,
  registerEfoeInvoice,
  registerEfoeInvoicePayee,
} from "./invoice-registry";
import { computeEfoePartnerFinancialVisibility } from "./partner-visibility";
import { recordEfoeRecovery, registerEfoeWriteOff } from "./recovery-registry";
import { registerEfoeRevenueEvent } from "./revenue-registry";
import { getEfoeRegistrySnapshot } from "./registry-snapshot";
import {
  evaluateEfoeSettlementEligibility,
  registerEfoeSettlementProfile,
} from "./settlement-profile-registry";
import {
  registerEfoeSettlement,
  registerEfoeSettlementBatch,
  releaseEfoeSettlement,
} from "./settlement-registry";
import {
  deriveEfoeDisbursementSnapshot,
  validateEfoeDistribution,
  validateEfoeOverDisbursement,
  validateEfoeRevenueRecognition,
} from "./validation-engine";

export function runEfoeFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEfoeComposition();

  const transactionRef = "TXN-001";
  const finalLoanAmount = 1000000;
  const totalDisbursed = 500000;

  const snapshot = deriveEfoeDisbursementSnapshot({
    transactionRef,
    finalLoanAmount,
    totalDisbursed,
    totalInvoicedAmount: 0,
  });

  const revenueEvent = registerEfoeRevenueEvent({
    eventCode: "REV-001",
    transactionRef,
    eventType: "origination_fee",
    amount: 25000,
    currencyCode: "INR",
    tenantId: "tenant-1",
    enabled: true,
    createdBy: "system",
  });

  const payee = registerEfoeInvoicePayee({
    payeeType: EFOE_INVOICE_PAYEE_TYPES.NBFC,
    payeeName: "Partner NBFC",
    payeeRef: "epne:partner:nbfc-001",
    enabled: true,
  });

  const invoice = registerEfoeInvoice({
    invoiceCode: "INV-001",
    transactionRef,
    revenueEventId: revenueEvent.id,
    payeeId: payee.id,
    payeeType: EFOE_INVOICE_PAYEE_TYPES.NBFC,
    invoiceAmount: 25000,
    finalLoanAmount,
    totalDisbursed,
    currencyCode: "INR",
    tenantId: "tenant-1",
    createdBy: "system",
  });

  const issued = issueEfoeInvoice(invoice.id, "system");

  const receipt = recordEfoeRevenueReceipt({
    invoiceId: invoice.id,
    receiptCode: "RCPT-001",
    amount: 25000,
    currencyCode: "INR",
    receivedOn: new Date().toISOString(),
    createdBy: "system",
  });

  const recognition = recognizeEfoeRevenue({
    revenueEventId: revenueEvent.id,
    invoiceId: invoice.id,
    receiptId: receipt.id,
    recognizedAmount: 25000,
    currencyCode: "INR",
    createdBy: "system",
  });

  registerEfoeDistributionRule({
    ruleCode: "STANDARD_SPLIT",
    ruleRef: "epde:rule:standard-split",
    description: "Standard revenue split",
    enabled: true,
  });

  const companyBeneficiary = registerEfoeBeneficiary({
    beneficiaryCode: "BEN-COMPANY",
    beneficiaryName: "Catalyst Company",
    beneficiaryType: EFOE_BENEFICIARY_TYPES.COMPANY,
    beneficiaryRef: "eowe:org:company",
    enabled: true,
    createdBy: "system",
  });

  const partnerBeneficiary = registerEfoeBeneficiary({
    beneficiaryCode: "BEN-PARTNER",
    beneficiaryName: "Wealth Partner",
    beneficiaryType: EFOE_BENEFICIARY_TYPES.WEALTH_PARTNER,
    beneficiaryRef: "epne:partner:wp-001",
    enabled: true,
    createdBy: "system",
  });

  const companyDist = allocateEfoeRevenueDistribution({
    recognitionId: recognition.id,
    beneficiaryId: companyBeneficiary.id,
    beneficiaryCode: companyBeneficiary.beneficiaryCode,
    allocatedAmount: 15000,
    allocatedPercent: 60,
    currencyCode: "INR",
    createdBy: "system",
  });

  const partnerDist = allocateEfoeRevenueDistribution({
    recognitionId: recognition.id,
    beneficiaryId: partnerBeneficiary.id,
    beneficiaryCode: partnerBeneficiary.beneficiaryCode,
    allocatedAmount: 10000,
    allocatedPercent: 40,
    currencyCode: "INR",
    createdBy: "system",
  });

  const profile = registerEfoeSettlementProfile({
    profileCode: "STANDARD_SETTLEMENT",
    profileName: "Standard Settlement Profile",
    description: "Default partner settlement requirements",
    enabled: true,
    createdBy: "system",
    requirements: [
      { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.PAN, requirementName: "PAN", mandatory: true },
      { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.BANK_DETAILS, requirementName: "Bank Details", mandatory: true },
      { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.KYC, requirementName: "KYC", mandatory: true },
      { requirementCode: EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.SIGNED_AGREEMENT, requirementName: "Signed Agreement", mandatory: true },
    ],
  });

  const eligibility = evaluateEfoeSettlementEligibility({
    beneficiaryId: partnerBeneficiary.id,
    profileId: profile.id,
    satisfiedRequirements: [
      EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.PAN,
      EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.BANK_DETAILS,
      EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.KYC,
      EFOE_DEFAULT_SETTLEMENT_REQUIREMENT_CODES.SIGNED_AGREEMENT,
    ],
  });

  const settlement = registerEfoeSettlement({
    settlementCode: "SET-001",
    beneficiaryId: partnerBeneficiary.id,
    distributionId: partnerDist.id,
    amount: 10000,
    currencyCode: "INR",
    isPartial: false,
    isAdvance: false,
    createdBy: "system",
  });

  const released = releaseEfoeSettlement(settlement.id, "system");

  const batch = registerEfoeSettlementBatch({
    batchCode: "BATCH-001",
    description: "January settlements",
    totalAmount: 10000,
    currencyCode: "INR",
    createdBy: "system",
  });

  registerEfoeAdjustment({
    adjustmentCode: "ADJ-001",
    transactionRef,
    adjustmentType: "fee_correction",
    amount: 500,
    currencyCode: "INR",
    reason: "Fee adjustment",
    createdBy: "system",
  });

  const clawback = registerEfoeClawback({
    clawbackCode: "CLAW-001",
    transactionRef,
    recognitionId: recognition.id,
    distributionId: partnerDist.id,
    amount: 2000,
    currencyCode: "INR",
    strategy: EFOE_CLAWBACK_STRATEGIES.RECOVER_FROM_FUTURE_SETTLEMENT,
    createdBy: "system",
  });

  applyEfoeClawback(clawback.id);

  recordEfoeRecovery({
    clawbackId: clawback.id,
    recoveryCode: "RECOV-001",
    amount: 1000,
    currencyCode: "INR",
    createdBy: "system",
  });

  const visibility = computeEfoePartnerFinancialVisibility("epne:partner:wp-001");
  const timeline = listEfoeTimeline(transactionRef);

  let rejectionChecks = 0;

  try {
    registerEfoeInvoice({
      invoiceCode: "INV-001",
      transactionRef,
      payeeId: payee.id,
      payeeType: EFOE_INVOICE_PAYEE_TYPES.NBFC,
      invoiceAmount: 1000,
      finalLoanAmount,
      totalDisbursed,
      currencyCode: "INR",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    deriveEfoeDisbursementSnapshot({
      transactionRef,
      finalLoanAmount: 1000000,
      totalDisbursed: 1100000,
      totalInvoicedAmount: 0,
    });
  } catch {
    rejectionChecks += 1;
  }

  const overDisburseCheck = validateEfoeOverDisbursement(1000000, 1100000);
  if (overDisburseCheck.issues.some((i) => i.code === "EFOE_OVER_DISBURSEMENT")) rejectionChecks += 1;

  try {
    recognizeEfoeRevenue({
      revenueEventId: revenueEvent.id,
      invoiceId: invoice.id,
      receiptId: receipt.id,
      recognizedAmount: 25000,
      currencyCode: "INR",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const invalidRecognition = validateEfoeRevenueRecognition({
    id: crypto.randomUUID(),
    revenueEventId: revenueEvent.id,
    invoiceId: invoice.id,
    receiptId: "nonexistent",
    recognizedAmount: 1000,
    currencyCode: "INR",
    status: "recognized",
    recognizedOn: new Date().toISOString(),
    createdBy: "system",
    createdOn: new Date().toISOString(),
  });
  if (invalidRecognition.issues.some((i) => i.code === "EFOE_INVALID_RECOGNITION")) rejectionChecks += 1;

  try {
    allocateEfoeRevenueDistribution({
      recognitionId: recognition.id,
      beneficiaryId: partnerBeneficiary.id,
      beneficiaryCode: partnerBeneficiary.beneficiaryCode,
      allocatedAmount: 5000,
      allocatedPercent: 20,
      currencyCode: "INR",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const invalidDist = validateEfoeDistribution(
    {
      id: crypto.randomUUID(),
      recognitionId: recognition.id,
      beneficiaryId: partnerBeneficiary.id,
      beneficiaryCode: partnerBeneficiary.beneficiaryCode,
      allocatedAmount: 5000,
      allocatedPercent: 50,
      currencyCode: "INR",
      status: "allocated",
      createdBy: "system",
      createdOn: new Date().toISOString(),
    },
    getEfoeRegistrySnapshot().distributions,
  );
  if (invalidDist.issues.some((i) => i.code === "EFOE_DUPLICATE_BENEFICIARY")) rejectionChecks += 1;

  const ineligibleBeneficiary = registerEfoeBeneficiary({
    beneficiaryCode: "BEN-INELIGIBLE",
    beneficiaryName: "Ineligible Partner",
    beneficiaryType: EFOE_BENEFICIARY_TYPES.PARTNER,
    beneficiaryRef: "epne:partner:ineligible",
    enabled: true,
    createdBy: "system",
  });

  try {
    const blockedSettlement = registerEfoeSettlement({
      settlementCode: "SET-BLOCKED",
      beneficiaryId: ineligibleBeneficiary.id,
      amount: 5000,
      currencyCode: "INR",
      isPartial: false,
      isAdvance: false,
      createdBy: "system",
    });
    releaseEfoeSettlement(blockedSettlement.id, "system");
  } catch {
    rejectionChecks += 1;
  }

  try {
    registerEfoeSettlement({
      settlementCode: "SET-001",
      beneficiaryId: partnerBeneficiary.id,
      amount: 5000,
      currencyCode: "INR",
      isPartial: true,
      isAdvance: false,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  const writeOffClawback = registerEfoeClawback({
    clawbackCode: "CLAW-WRITE",
    transactionRef,
    amount: 500,
    currencyCode: "INR",
    strategy: EFOE_CLAWBACK_STRATEGIES.WRITE_OFF,
    createdBy: "system",
  });

  registerEfoeWriteOff({
    clawbackId: writeOffClawback.id,
    writeOffCode: "WO-001",
    amount: 500,
    currencyCode: "INR",
    reason: "Uncollectable",
    createdBy: "system",
  });

  const snap = getEfoeRegistrySnapshot();

  const passed =
    snapshot.disbursementStatus === EFOE_DISBURSEMENT_STATUS.PARTIALLY_DISBURSED &&
    snapshot.invoiceEligibleAmount === totalDisbursed &&
    issued?.lifecycleStatus === EFOE_INVOICE_LIFECYCLE_STATUS.ISSUED &&
    recognition.status === "recognized" &&
    companyDist.allocatedPercent === 60 &&
    partnerDist.allocatedPercent === 40 &&
    eligibility.satisfied &&
    released?.status === EFOE_SETTLEMENT_STATUS.RELEASED &&
    visibility.revenueRecognized >= 10000 &&
    visibility.settlementReleased >= 10000 &&
    timeline.length >= 5 &&
    snap.invoices.length === 1 &&
    snap.revenueRecognitions.length === 1 &&
    snap.distributions.length === 2 &&
    snap.settlements.length >= 2 &&
    snap.settlementProfiles.length === 1 &&
    snap.clawbacks.length === 2 &&
    snap.recoveries.length === 1 &&
    snap.writeOffs.length === 1 &&
    snap.auditReferences.length >= 5 &&
    rejectionChecks >= 8;

  return {
    passed,
    details: {
      transactionRef,
      disbursementStatus: snapshot.disbursementStatus,
      invoiceEligibleAmount: snapshot.invoiceEligibleAmount,
      recognitionAmount: recognition.recognizedAmount,
      companyAllocation: companyDist.allocatedAmount,
      partnerAllocation: partnerDist.allocatedAmount,
      settlementStatus: released?.status,
      partnerVisibility: visibility,
      timelineEntries: timeline.length,
      rejectionChecks,
      invoices: snap.invoices.length,
      auditReferences: snap.auditReferences.length,
      batchCode: batch.batchCode,
    },
  };
}
