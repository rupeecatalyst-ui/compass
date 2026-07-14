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
  return {
    processTitle: file.loanProduct?.trim() || "Loan File",
    module: "loan",
    message: "Missing fields required to continue this business process.",
    fields: mapLoanIssuesToCompletionFields(issues),
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
