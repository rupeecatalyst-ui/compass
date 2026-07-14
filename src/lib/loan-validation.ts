import type { LoanFile, PipelineStage } from "@/types/catalyst-one";
import { isProductSecured } from "@/constants/product-master";
import {
  computeTopUpRequested,
  getProductsForLendingType,
  isBalanceTransferVisible,
  isLoanWon,
  isStageBeyond,
  migrateLegacyStage,
  requiresFinalLoanAmount,
  shouldShowFinalLoanAmount,
} from "@/constants/loan-stage-master";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import type { BusinessCompletionControl } from "@/types/business-completion";

export interface LoanValidationIssue {
  code: string;
  fieldKey: string;
  label: string;
  message: string;
  control?: BusinessCompletionControl;
}

export interface LoanValidationResult {
  valid: boolean;
  /** Human-readable messages (legacy consumers). */
  errors: string[];
  /** Structured issues for Business Completion Cards (CF-WF-001). */
  issues: LoanValidationIssue[];
}

function pushIssue(
  issues: LoanValidationIssue[],
  issue: LoanValidationIssue,
): void {
  issues.push(issue);
}

/** CRC-024 — Centralized loan save validation (master-driven). */
export function validateLoanFile(
  file: LoanFile,
  previous?: LoanFile,
): LoanValidationResult {
  const issues: LoanValidationIssue[] = [];

  if (!file.lendingType) {
    pushIssue(issues, {
      code: "LOAN_MISSING_LENDING_TYPE",
      fieldKey: "lendingType",
      label: "Lending Type",
      message: "Lending Type is required.",
      control: "lending_type",
    });
  }

  if (!file.transactionType) {
    pushIssue(issues, {
      code: "LOAN_MISSING_TRANSACTION_TYPE",
      fieldKey: "transactionType",
      label: "Transaction Type",
      message: "Transaction Type is required.",
      control: "transaction_type",
    });
  }

  if (!file.loanProduct) {
    pushIssue(issues, {
      code: "LOAN_MISSING_PRODUCT",
      fieldKey: "loanProduct",
      label: "Loan Product",
      message: "Product is required.",
      control: "loan_product",
    });
  } else if (file.lendingType) {
    const allowed = getProductsForLendingType(file.lendingType);
    if (!allowed.includes(file.loanProduct)) {
      pushIssue(issues, {
        code: "LOAN_INVALID_PRODUCT",
        fieldKey: "loanProduct",
        label: "Loan Product",
        message: `Product "${file.loanProduct}" is not valid for ${file.lendingType} lending.`,
        control: "loan_product",
      });
    }
  }

  if (
    isBalanceTransferVisible(file.lendingType ?? "secured", file.transactionType ?? "fresh")
  ) {
    if (!file.btInstitutionId) {
      pushIssue(issues, {
        code: "LOAN_MISSING_BT_INSTITUTION",
        fieldKey: "btInstitutionId",
        label: "BT Institution",
        message: "BT Institution is required for Balance Transfer.",
        control: "bt_institution",
      });
    }
    if (!file.btAmount || file.btAmount <= 0) {
      pushIssue(issues, {
        code: "LOAN_MISSING_BT_AMOUNT",
        fieldKey: "btAmount",
        label: "BT Amount",
        message: "BT Amount is required for Balance Transfer.",
        control: "bt_amount",
      });
    } else if (file.btAmount > file.requiredAmount) {
      pushIssue(issues, {
        code: "LOAN_BT_AMOUNT_EXCEEDS",
        fieldKey: "btAmount",
        label: "BT Amount",
        message: "BT Amount cannot exceed Requested Loan Amount.",
        control: "bt_amount",
      });
    }
  }

  if (requiresFinalLoanAmount(file.stage) && (!file.finalLoanAmount || file.finalLoanAmount <= 0)) {
    pushIssue(issues, {
      code: "LOAN_MISSING_FINAL_AMOUNT",
      fieldKey: "finalLoanAmount",
      label: "Final Loan Amount",
      message: "Final Loan Amount is required beyond Final Approved.",
      control: "final_loan_amount",
    });
  }

  if (isProductSecured(file.loanProduct) && !file.propertyType?.trim()) {
    pushIssue(issues, {
      code: "LOAN_MISSING_PROPERTY_TYPE",
      fieldKey: "propertyType",
      label: "Property Type",
      message: "Property Type is required for secured property-backed products.",
      control: "property_type",
    });
  }

  if (isProductSecured(file.loanProduct) && !file.occupancyId?.trim()) {
    pushIssue(issues, {
      code: "LOAN_MISSING_PROPERTY_OCCUPANCY",
      fieldKey: "occupancyId",
      label: "Property Occupancy",
      message: "Property Occupancy is required for secured property-backed products.",
      control: "occupancy",
    });
  }

  if (previous && isStageBeyond(file.stage, previous.stage)) {
    if (
      isStageBeyond(file.stage, "final_approved") &&
      !file.finalLoanAmount &&
      !previous.finalLoanAmount
    ) {
      pushIssue(issues, {
        code: "LOAN_MISSING_FINAL_AMOUNT_STAGE",
        fieldKey: "finalLoanAmount",
        label: "Final Loan Amount",
        message: "Final Loan Amount is required before moving beyond Final Approved.",
        control: "final_loan_amount",
      });
    }
  }

  const errors = issues.map((i) => i.message);
  return { valid: issues.length === 0, errors, issues };
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
