import type { LoanFile, PipelineStage } from "@/types/catalyst-one";
import {
  computeTopUpRequested,
  getProductsForLendingType,
  isBalanceTransferVisible,
  isLoanWon,
  isPropertyQualificationVisible,
  isStageBeyond,
  migrateLegacyStage,
  requiresFinalLoanAmount,
  shouldShowFinalLoanAmount,
} from "@/constants/loan-stage-master";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";

export interface LoanValidationResult {
  valid: boolean;
  errors: string[];
}

/** CRC-024 — Centralized loan save validation (master-driven). */
export function validateLoanFile(
  file: LoanFile,
  previous?: LoanFile,
): LoanValidationResult {
  const errors: string[] = [];

  if (!file.lendingType) {
    errors.push("Lending Type is required.");
  }

  if (!file.transactionType) {
    errors.push("Transaction Type is required.");
  }

  if (!file.loanProduct) {
    errors.push("Product is required.");
  } else if (file.lendingType) {
    const allowed = getProductsForLendingType(file.lendingType);
    if (!allowed.includes(file.loanProduct)) {
      errors.push(`Product "${file.loanProduct}" is not valid for ${file.lendingType} lending.`);
    }
  }

  if (
    isBalanceTransferVisible(file.lendingType ?? "secured", file.transactionType ?? "fresh")
  ) {
    if (!file.btInstitutionId) {
      errors.push("BT Institution is required for Balance Transfer.");
    }
    if (!file.btAmount || file.btAmount <= 0) {
      errors.push("BT Amount is required for Balance Transfer.");
    } else if (file.btAmount > file.requiredAmount) {
      errors.push("BT Amount cannot exceed Requested Loan Amount.");
    }
  }

  if (requiresFinalLoanAmount(file.stage) && (!file.finalLoanAmount || file.finalLoanAmount <= 0)) {
    errors.push("Final Loan Amount is required beyond Final Approved.");
  }

  if (isPropertyQualificationVisible(file.loanProduct) && !file.propertyType?.trim()) {
    errors.push("Property Type is required for secured property-backed products.");
  }

  if (previous && isStageBeyond(file.stage, previous.stage)) {
    if (
      isStageBeyond(file.stage, "final_approved") &&
      !file.finalLoanAmount &&
      !previous.finalLoanAmount
    ) {
      errors.push("Final Loan Amount is required before moving beyond Final Approved.");
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Normalize legacy/migrated fields on load or save. */
export function normalizeLoanFile(file: LoanFile): LoanFile {
  const stage = migrateLegacyStage(file.stage);
  const lendingType = file.lendingType ?? inferLendingType(file.loanProduct);
  const transactionType = file.transactionType ?? "fresh";
  const topUpRequested =
    file.topUpRequested ??
    (file.btAmount ? computeTopUpRequested(file.requiredAmount, file.btAmount) : 0);

  const legacy = file as LoanFile & {
    property?: string;
    propertyDetails?: {
      propertyType?: string;
      marketValue?: number;
      agreementValue?: number;
    };
  };
  const propertyType = file.propertyType ?? legacy.propertyDetails?.propertyType;
  const approxPropertyValue =
    file.approxPropertyValue ??
    legacy.propertyDetails?.marketValue ??
    legacy.propertyDetails?.agreementValue;

  let normalized: LoanFile = {
    ...file,
    stage,
    lendingType,
    transactionType,
    topUpRequested,
    propertyType,
    approxPropertyValue,
    expectedRevenue: Math.round(
      getRevenueBaseAmount({ ...file, stage, finalLoanAmount: file.finalLoanAmount }) *
        (file.revenuePercent / 100),
    ),
  };

  if (isLoanWon(stage)) {
    normalized = applyWonTransition(normalized);
  }

  return normalized;
}

export function inferLendingTypeFromProduct(product: string): LoanFile["lendingType"] {
  return inferLendingType(product);
}

function inferLendingType(product: string): LoanFile["lendingType"] {
  if (
    ["Personal Loan", "Business Loan (Unsecured)", "Credit Card"].includes(product)
  ) {
    return "unsecured";
  }
  return "secured";
}

/** CRC-017 — Won stage business rules. */
export function applyWonTransition(file: LoanFile): LoanFile {
  const revenueBase = getRevenueBaseAmount(file);
  const wonTimeline = {
    id: `tl-won-${Date.now()}`,
    title: "Loan Won",
    description: "Engagement completed — moved to Completed Loans",
    timestamp: new Date().toISOString(),
    completed: true,
  };

  const alreadyWon = file.timeline.some((e) => e.title === "Loan Won");
  const timeline = alreadyWon ? file.timeline : [wonTimeline, ...file.timeline];

  return {
    ...file,
    stage: "won",
    status: "completed",
    progress: 100,
    expectedRevenue: Math.round(revenueBase * (file.revenuePercent / 100)),
    timeline,
  };
}

export function canShowFinalLoanAmount(stage: PipelineStage): boolean {
  return shouldShowFinalLoanAmount(stage);
}
