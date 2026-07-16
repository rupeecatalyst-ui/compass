import type { LoanFile, PipelineStage } from "@/types/catalyst-one";
import { isProductSecured } from "@/constants/product-master";
import { isOccupancyFieldVisible } from "@/constants/occupancy-master";
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
import { computeExpectedRevenueAmount } from "@/lib/financial-engine-revenue";
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
  /** Structured issues for CHANAKYA Business Guidance Cards (CF-CHANAKYA-001). */
  issues: LoanValidationIssue[];
}

function pushIssue(
  issues: LoanValidationIssue[],
  issue: LoanValidationIssue,
): void {
  issues.push(issue);
}

/** CRC-024 / CF-CHANAKYA-001 — Loan save rules (emits guidance, not rejections). */
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
      message: "This tells me whether the journey is secured or unsecured.",
      control: "lending_type",
    });
  }

  if (!file.transactionType) {
    pushIssue(issues, {
      code: "LOAN_MISSING_TRANSACTION_TYPE",
      fieldKey: "transactionType",
      label: "Transaction Type",
      message: "Fresh, balance transfer, or top-up shapes the rest of the journey.",
      control: "transaction_type",
    });
  }

  if (!file.loanProduct) {
    pushIssue(issues, {
      code: "LOAN_MISSING_PRODUCT",
      fieldKey: "loanProduct",
      label: "Loan Product",
      message: "The product chooses the path for underwriting and lender fit.",
      control: "loan_product",
    });
  } else if (file.lendingType) {
    const allowed = getProductsForLendingType(file.lendingType);
    if (!allowed.includes(file.loanProduct)) {
      pushIssue(issues, {
        code: "LOAN_INVALID_PRODUCT",
        fieldKey: "loanProduct",
        label: "Loan Product",
        message: `Let's pick a product that fits ${file.lendingType} lending.`,
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
        label: "Current Lending Institution",
        message: "I need the existing lender so the balance transfer can proceed.",
        control: "bt_institution",
      });
    }
    if (!file.btAmount || file.btAmount <= 0) {
      pushIssue(issues, {
        code: "LOAN_MISSING_BT_AMOUNT",
        fieldKey: "btAmount",
        label: "Outstanding Loan Amount",
        message: "The outstanding amount with the existing lender keeps the transfer accurate.",
        control: "bt_amount",
      });
    } else if (file.btAmount > file.requiredAmount) {
      pushIssue(issues, {
        code: "LOAN_BT_AMOUNT_EXCEEDS",
        fieldKey: "btAmount",
        label: "Outstanding Loan Amount",
        message: "Outstanding amount should stay within the requested loan amount for this journey.",
        control: "bt_amount",
      });
    }
  }

  if (requiresFinalLoanAmount(file.stage) && (!file.finalLoanAmount || file.finalLoanAmount <= 0)) {
    pushIssue(issues, {
      code: "LOAN_MISSING_FINAL_AMOUNT",
      fieldKey: "finalLoanAmount",
      label: "Final Loan Amount",
      message: "Once the case is finally approved, I need the final loan amount to continue.",
      control: "final_loan_amount",
    });
  }

  if (isProductSecured(file.loanProduct) && !file.propertyType?.trim()) {
    pushIssue(issues, {
      code: "LOAN_MISSING_PROPERTY_TYPE",
      fieldKey: "propertyType",
      label: "Property Type",
      message: "Property type helps me place this secured product correctly.",
      control: "property_type",
    });
  }

  if (isOccupancyFieldVisible(file.loanProduct) && !file.occupancyId?.trim()) {
    pushIssue(issues, {
      code: "LOAN_MISSING_PROPERTY_OCCUPANCY",
      fieldKey: "occupancyId",
      label: "Property Occupancy",
      message:
        "Occupancy tells me how the secured property is used — required for this product before we move ahead.",
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
        message: "I need the final loan amount before we move past Final Approved.",
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
    expectedRevenue: computeExpectedRevenueAmount({
      ...file,
      stage,
      lendingType,
      transactionType,
      topUpRequested,
      propertyType,
      approxPropertyValue,
    }),
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
    expectedRevenue: computeExpectedRevenueAmount({
      ...file,
      stage: "won",
      status: "completed",
      progress: 100,
      timeline,
    }),
    timeline,
  };
}

export function canShowFinalLoanAmount(stage: PipelineStage): boolean {
  return shouldShowFinalLoanAmount(stage);
}
