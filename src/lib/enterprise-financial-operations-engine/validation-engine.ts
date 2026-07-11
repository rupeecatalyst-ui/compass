/**
 * EFOE validation engine.
 */

import {
  EFOE_DISBURSEMENT_STATUS,
} from "@/constants/enterprise-financial-operations-engine";
import type {
  EfoeClawback,
  EfoeDisbursementSnapshot,
  EfoeInvoice,
  EfoeRecovery,
  EfoeRevenueDistribution,
  EfoeRevenueRecognition,
  EfoeSettlement,
  EfoeSettlementEligibility,
  EfoeValidationIssue,
  EfoeValidationResult,
} from "@/types/enterprise-financial-operations-engine";
import { getEfoePorts } from "./composition";

function issue(
  code: string,
  severity: EfoeValidationIssue["severity"],
  message: string,
  entityRef?: string,
): EfoeValidationIssue {
  return { code, severity, message, entityRef };
}

export function deriveEfoeDisbursementSnapshot(input: {
  transactionRef: string;
  finalLoanAmount: number;
  totalDisbursed: number;
  totalInvoicedAmount: number;
}): EfoeDisbursementSnapshot {
  if (input.totalDisbursed > input.finalLoanAmount) {
    throw new Error(
      `EFOE validation: over-disbursement — total disbursed (${input.totalDisbursed}) exceeds final loan amount (${input.finalLoanAmount}).`,
    );
  }

  let disbursementStatus: EfoeDisbursementSnapshot["disbursementStatus"];
  if (input.totalDisbursed === 0) {
    disbursementStatus = EFOE_DISBURSEMENT_STATUS.NOT_DISBURSED;
  } else if (input.totalDisbursed < input.finalLoanAmount) {
    disbursementStatus = EFOE_DISBURSEMENT_STATUS.PARTIALLY_DISBURSED;
  } else {
    disbursementStatus = EFOE_DISBURSEMENT_STATUS.FULLY_DISBURSED;
  }

  const pendingDisbursement = input.finalLoanAmount - input.totalDisbursed;
  const disbursementPercent =
    input.finalLoanAmount > 0 ? (input.totalDisbursed / input.finalLoanAmount) * 100 : 0;
  const invoiceEligibleAmount = input.totalDisbursed;
  const remainingInvoiceEligible = invoiceEligibleAmount - input.totalInvoicedAmount;

  return {
    transactionRef: input.transactionRef,
    finalLoanAmount: input.finalLoanAmount,
    totalDisbursed: input.totalDisbursed,
    pendingDisbursement,
    disbursementPercent,
    disbursementStatus,
    invoiceEligibleAmount,
    totalInvoicedAmount: input.totalInvoicedAmount,
    remainingInvoiceEligible,
    derivedOn: new Date().toISOString(),
  };
}

export function validateEfoeInvoice(invoice: EfoeInvoice, disbursementBasisAmount: number): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  const duplicate = getEfoePorts().invoices.findByCode(invoice.invoiceCode);
  if (duplicate && duplicate.id !== invoice.id) {
    issues.push(issue("EFOE_DUPLICATE_INVOICE", "error", "Invoice code already exists.", invoice.id));
  }

  if (invoice.disbursementBasisAmount !== disbursementBasisAmount) {
    issues.push(
      issue(
        "EFOE_INVALID_INVOICE",
        "error",
        "Invoice must use system-derived disbursement basis amount.",
        invoice.id,
      ),
    );
  }

  if (invoice.invoiceAmount > disbursementBasisAmount) {
    issues.push(
      issue(
        "EFOE_INVALID_INVOICE",
        "error",
        "Invoice amount cannot exceed disbursement basis amount.",
        invoice.id,
      ),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEfoeRevenueRecognition(
  recognition: EfoeRevenueRecognition,
): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  const invoice = getEfoePorts().invoices.findById(recognition.invoiceId);
  if (!invoice) {
    issues.push(issue("EFOE_INVALID_RECOGNITION", "error", "Invoice not found.", recognition.id));
  } else if (invoice.lifecycleStatus !== "paid") {
    issues.push(
      issue(
        "EFOE_INVALID_RECOGNITION",
        "error",
        "Revenue can only be recognized after payment received.",
        recognition.id,
      ),
    );
  }

  const receipt = getEfoePorts().revenueReceipts.findById(recognition.receiptId);
  if (!receipt) {
    issues.push(issue("EFOE_INVALID_RECOGNITION", "error", "Receipt not found.", recognition.id));
  }

  const duplicate = getEfoePorts()
    .revenueRecognitions.list()
    .find(
      (r) =>
        r.id !== recognition.id &&
        r.invoiceId === recognition.invoiceId &&
        r.receiptId === recognition.receiptId &&
        r.status === "recognized",
    );
  if (duplicate) {
    issues.push(
      issue("EFOE_INVALID_RECOGNITION", "error", "Revenue already recognized for this receipt.", recognition.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEfoeDistribution(
  distribution: EfoeRevenueDistribution,
  allocations: EfoeRevenueDistribution[],
): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  const recognition = getEfoePorts().revenueRecognitions.findById(distribution.recognitionId);
  if (!recognition) {
    issues.push(issue("EFOE_INVALID_DISTRIBUTION", "error", "Recognition not found.", distribution.id));
  } else if (recognition.status !== "recognized") {
    issues.push(
      issue(
        "EFOE_INVALID_DISTRIBUTION",
        "error",
        "Distribution can only occur after revenue recognition.",
        distribution.id,
      ),
    );
  }

  const beneficiary = getEfoePorts().beneficiaries.findById(distribution.beneficiaryId);
  if (!beneficiary) {
    issues.push(issue("EFOE_INVALID_DISTRIBUTION", "error", "Beneficiary not found.", distribution.id));
  }

  const duplicateBeneficiary = allocations.find(
    (d) =>
      d.id !== distribution.id &&
      d.recognitionId === distribution.recognitionId &&
      d.beneficiaryId === distribution.beneficiaryId,
  );
  if (duplicateBeneficiary) {
    issues.push(
      issue("EFOE_DUPLICATE_BENEFICIARY", "error", "Beneficiary already allocated.", distribution.id),
    );
  }

  const totalPercent = allocations
    .filter((d) => d.recognitionId === distribution.recognitionId)
    .reduce((sum, d) => sum + d.allocatedPercent, 0);
  if (totalPercent > 100) {
    issues.push(
      issue("EFOE_INVALID_DISTRIBUTION", "error", "Total allocation exceeds 100%.", distribution.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEfoeSettlementEligibility(
  eligibility: EfoeSettlementEligibility,
): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  if (!getEfoePorts().beneficiaries.findById(eligibility.beneficiaryId)) {
    issues.push(issue("EFOE_SETTLEMENT_ELIGIBILITY_FAILURE", "error", "Beneficiary not found.", eligibility.id));
  }

  const profile = getEfoePorts().settlementProfiles.findById(eligibility.profileId);
  if (!profile) {
    issues.push(
      issue("EFOE_SETTLEMENT_ELIGIBILITY_FAILURE", "error", "Settlement profile not found.", eligibility.id),
    );
  } else {
    const mandatory = getEfoePorts()
      .settlementRequirements.listByProfile(profile.id)
      .filter((r) => r.mandatory && r.enabled);
    const missing = mandatory.filter((r) => !eligibility.satisfiedRequirements.includes(r.requirementCode));
    if (missing.length > 0 && eligibility.satisfied) {
      issues.push(
        issue(
          "EFOE_SETTLEMENT_ELIGIBILITY_FAILURE",
          "error",
          `Missing mandatory requirements: ${missing.map((m) => m.requirementCode).join(", ")}.`,
          eligibility.id,
        ),
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEfoeSettlement(settlement: EfoeSettlement): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  const duplicate = getEfoePorts().settlements.findByCode(settlement.settlementCode);
  if (duplicate && duplicate.id !== settlement.id) {
    issues.push(issue("EFOE_DUPLICATE_SETTLEMENT", "error", "Settlement code already exists.", settlement.id));
  }

  const eligibility = getEfoePorts().settlementEligibilities.findByBeneficiary(settlement.beneficiaryId);
  const requiresEligibility = ["released", "processing", "eligible"].includes(settlement.status);
  if (requiresEligibility && !eligibility?.satisfied) {
    const hasOverride = getEfoePorts().settlementOverrides.listBySettlement(settlement.id).length > 0;
    if (!hasOverride) {
      issues.push(
        issue(
          "EFOE_SETTLEMENT_ELIGIBILITY_FAILURE",
          "error",
          "Settlement blocked until eligibility is satisfied.",
          settlement.id,
        ),
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEfoeClawback(clawback: EfoeClawback): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  const duplicate = getEfoePorts().clawbacks.findByCode(clawback.clawbackCode);
  if (duplicate && duplicate.id !== clawback.id) {
    issues.push(issue("EFOE_INVALID_CLAWBACK", "error", "Clawback code already exists.", clawback.id));
  }

  if (clawback.amount <= 0) {
    issues.push(issue("EFOE_INVALID_CLAWBACK", "error", "Clawback amount must be positive.", clawback.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEfoeRecovery(recovery: EfoeRecovery, clawback: EfoeClawback): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  const existingRecoveries = getEfoePorts().recoveries.listByClawback(clawback.id);
  const totalRecovered =
    existingRecoveries.filter((r) => r.id !== recovery.id).reduce((sum, r) => sum + r.amount, 0) +
    recovery.amount;

  if (totalRecovered > clawback.amount) {
    issues.push(
      issue("EFOE_INVALID_RECOVERY", "error", "Total recovery exceeds clawback amount.", recovery.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEfoeOverDisbursement(
  finalLoanAmount: number,
  totalDisbursed: number,
): EfoeValidationResult {
  const issues: EfoeValidationIssue[] = [];

  if (totalDisbursed > finalLoanAmount) {
    issues.push(
      issue(
        "EFOE_OVER_DISBURSEMENT",
        "error",
        `Total disbursed (${totalDisbursed}) exceeds final loan amount (${finalLoanAmount}).`,
      ),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}
