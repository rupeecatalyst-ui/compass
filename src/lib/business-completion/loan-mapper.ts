/**
 * Maps loan validation issues → Business Completion fields (CF-WF-001).
 * Field definitions come from the validation/rules layer — never hardcoded in UI.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type {
  BusinessCompletionField,
  BusinessCompletionRequest,
} from "@/types/business-completion";
import type { LoanValidationIssue } from "@/lib/loan-validation";
import { BusinessCompletionRequiredError } from "./errors";

const CONTROL_BY_FIELD: Record<string, BusinessCompletionField["control"]> = {
  lendingType: "lending_type",
  transactionType: "transaction_type",
  loanProduct: "loan_product",
  btInstitutionId: "bt_institution",
  btAmount: "bt_amount",
  finalLoanAmount: "final_loan_amount",
  propertyType: "property_type",
  occupancyId: "occupancy",
};

export function mapLoanIssuesToCompletionFields(
  issues: LoanValidationIssue[],
): BusinessCompletionField[] {
  const seen = new Set<string>();
  const fields: BusinessCompletionField[] = [];
  for (const issue of issues) {
    if (seen.has(issue.fieldKey)) continue;
    seen.add(issue.fieldKey);
    fields.push({
      fieldKey: issue.fieldKey,
      label: issue.label,
      code: issue.code,
      control: issue.control ?? CONTROL_BY_FIELD[issue.fieldKey] ?? "text",
      helpText: issue.message,
      required: true,
    });
  }
  return fields;
}

export function buildLoanBusinessCompletionRequest(
  file: LoanFile,
  issues: LoanValidationIssue[],
): BusinessCompletionRequest {
  const count = issues.length;
  const process = file.loanProduct?.trim() || "Loan Journey";
  return {
    processTitle: process,
    module: "loan",
    message:
      count === 1
        ? `I need one more detail before I can continue this ${process}.`
        : `I need a few more details before I can continue this ${process}.`,
    fields: mapLoanIssuesToCompletionFields(issues).map((field) => ({
      ...field,
      // Prefer business why-text over technical rule codes in the UI
      helpText: field.helpText?.replace(/^(is required|required|mandatory)[.:]?\s*/i, "") ?? field.helpText,
    })),
    resumeToken: file.id,
  };
}

export function throwLoanBusinessCompletionIfNeeded(
  file: LoanFile,
  issues: LoanValidationIssue[],
): void {
  if (issues.length === 0) return;
  throw new BusinessCompletionRequiredError(
    buildLoanBusinessCompletionRequest(file, issues),
  );
}
