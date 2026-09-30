import { APPROX_CIBIL_SCORE_OPTIONS } from "@/constants/cibil-score-master";
import { LEAD_INFORMATION_EMPLOYMENT_OPTIONS } from "@/constants/lead-information-workspace";

export type ChanakyaFactControl = "money" | "money_or_zero" | "months" | "count" | "date" | "text" | "select";

export type ChanakyaFactInput = {
  label: string;
  patchKey: string;
  control: ChanakyaFactControl;
  options?: ReadonlyArray<{ value: string; label: string }>;
};

export const CHANAKYA_FACT_INPUTS: Record<string, ChanakyaFactInput> = {
  "borrower.employmentFamily": {
    label: "Employment Type",
    patchKey: "employmentTypeCode",
    control: "select",
    options: LEAD_INFORMATION_EMPLOYMENT_OPTIONS,
  },
  "incomeAndObligations.monthlyIncome": {
    label: "Monthly Income",
    patchKey: "monthlyIncomeRupees",
    control: "money",
  },
  "incomeAndObligations.existingMonthlyObligations": {
    label: "Existing Monthly Obligations",
    patchKey: "existingMonthlyObligationsRupees",
    control: "money_or_zero",
  },
  "incomeAndObligations.requestedTenureMonths": {
    label: "Requested Tenure",
    patchKey: "requestedTenureMonths",
    control: "months",
  },
  "loanRequirement.requestedAmount": {
    label: "Requested Amount",
    patchKey: "requestedAmount",
    control: "money",
  },
  "property.propertyValue": {
    label: "Property Value",
    patchKey: "propertyValueRupees",
    control: "money",
  },
  "cibil.kind": {
    label: "CIBIL",
    patchKey: "approxCibilScore",
    control: "select",
    options: APPROX_CIBIL_SCORE_OPTIONS.map((row) => ({ value: row.value, label: row.label })),
  },
  "balanceTransfer.outstandingPrincipal": {
    label: "Outstanding Loan Amount",
    patchKey: "btAmount",
    control: "money",
  },
};

export function chanakyaSubmitValue(control: ChanakyaFactControl, raw: string): string | number | null {
  const text = raw.trim().replace(/,/g, "");
  if (!text) return null;
  if (control === "select" || control === "text" || control === "date") return text;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return null;
  if (control === "money" && amount <= 0) return null;
  if (control === "money_or_zero" && amount < 0) return null;
  if (control === "months" && (!Number.isInteger(amount) || amount <= 0)) return null;
  if (control === "count" && (!Number.isInteger(amount) || amount < 0)) return null;
  return amount;
}
