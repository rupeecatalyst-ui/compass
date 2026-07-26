/**
 * Maps loan validation issues → Business Completion fields (CF-WF-001).
 * Messages always name the missing field, reason, and action — never generic-only.
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
  commercialPayee: "commercial_payee",
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

/** Explicit guidance: Missing field · Reason · Action required. */
export function buildLoanCompletionGuidanceMessage(
  processTitle: string,
  fields: BusinessCompletionField[],
): string {
  if (fields.length === 0) {
    return `Complete required details to continue this ${processTitle}.`;
  }
  if (fields.length === 1) {
    const field = fields[0]!;
    const reason =
      field.helpText?.replace(/^(is required|required|mandatory)[.:]?\s*/i, "").trim() ||
      `${field.label} is mandatory for this product.`;
    return `Missing: ${field.label}. ${reason} Action: provide ${field.label} before continuing.`;
  }
  const labels = fields.map((f) => f.label).join(", ");
  return `Missing: ${labels}. These fields are required to continue this ${processTitle}. Action: complete each listed field.`;
}

export function buildLoanBusinessCompletionRequest(
  file: LoanFile,
  issues: LoanValidationIssue[],
): BusinessCompletionRequest {
  const process = file.loanProduct?.trim() || "Loan Journey";
  const fields = mapLoanIssuesToCompletionFields(issues).map((field) => ({
    ...field,
    helpText:
      field.helpText?.replace(/^(is required|required|mandatory)[.:]?\s*/i, "") ??
      field.helpText,
  }));
  return {
    processTitle: process,
    module: "loan",
    message: buildLoanCompletionGuidanceMessage(process, fields),
    fields,
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
