import { APPROX_CIBIL_SCORE_OPTIONS } from "@/constants/cibil-score-master";
import { LEAD_INFORMATION_EMPLOYMENT_OPTIONS } from "@/constants/lead-information-workspace";
import {
  CANONICAL_CONSTRUCTION_STATUSES,
  CANONICAL_PROPERTY_CATEGORIES,
  CANONICAL_REPAYMENT_TRACKS,
  CANONICAL_RESIDENCY_VALUES,
} from "@/lib/lead-information/canonical-recommendation-facts";
import { PROGRAMME_RESIDENCY } from "@/constants/product-programme-operations/controlled-masters";

export type ChanakyaFactControl = "money" | "money_or_zero" | "months" | "count" | "date" | "text" | "select" | "age" | "city";

export type ChanakyaFactInput = {
  label: string;
  patchKey: string;
  control: ChanakyaFactControl;
  options?: ReadonlyArray<{ value: string; label: string }>;
};

export const CHANAKYA_FACT_INPUTS: Record<string, ChanakyaFactInput> = {
  "borrower.ageYears": {
    label: "Age",
    patchKey: "borrowerAgeYears",
    control: "age",
  },
  "borrower.residency": {
    label: "Residency",
    patchKey: "residency",
    control: "select",
    options: CANONICAL_RESIDENCY_VALUES.map((value) => ({
      value,
      label: PROGRAMME_RESIDENCY.find((item) => item.id === value)?.label ?? value,
    })),
  },
  "property.propertyCategory": {
    label: "Property Category",
    patchKey: "propertyCategory",
    control: "select",
    options: CANONICAL_PROPERTY_CATEGORIES.map((value) => ({ value, label: value })),
  },
  "property.constructionStatus": {
    label: "Construction Status",
    patchKey: "constructionStatus",
    control: "select",
    options: CANONICAL_CONSTRUCTION_STATUSES.map((value) => ({
      value,
      label: value === "under_construction" ? "Under Construction" : "Ready",
    })),
  },
  "property.propertyCity": {
    label: "Property City",
    patchKey: "cityLabel",
    control: "city",
  },
  "property.propertyState": {
    label: "Property City",
    patchKey: "cityLabel",
    control: "city",
  },
  "balanceTransfer.loanStartDate": {
    label: "Loan Start Date",
    patchKey: "loanStartDate",
    control: "date",
  },
  "balanceTransfer.repaymentTrack": {
    label: "Repayment Track",
    patchKey: "repaymentTrack",
    control: "select",
    options: CANONICAL_REPAYMENT_TRACKS.map((value) => ({
      value,
      label: value === "not_sure" ? "Not sure" : value === "yes" ? "Yes" : "No",
    })),
  },
  "balanceTransfer.delayedEmiCount": {
    label: "Delayed EMI Count",
    patchKey: "delayedEmiCount",
    control: "count",
  },
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
  if (control === "select" || control === "text" || control === "date" || control === "city") return text;
  if (control === "age") {
    if (/[eE.]/.test(text)) return null;
    const years = Number(text);
    if (!Number.isInteger(years) || years < 1 || years > 120) return null;
    return years;
  }
  const amount = Number(text);
  if (!Number.isFinite(amount)) return null;
  if (control === "money" && amount <= 0) return null;
  if (control === "money_or_zero" && amount < 0) return null;
  if (control === "months" && (!Number.isInteger(amount) || amount <= 0)) return null;
  if (control === "count" && (!Number.isInteger(amount) || amount < 0)) return null;
  return amount;
}
