import type {
  AnalyzeDealCustomerCategory,
  AnalyzeDealInputs,
} from "@/types/analyze-deal";
import {
  APPROX_CIBIL_SCORE_OPTIONS,
  shouldRevealLowScoreQuestions as sharedShouldRevealLowScoreQuestions,
  type ApproxCibilScoreBand,
} from "@/constants/cibil-score-master";
import { CONTEXT_CUSTOMER_CATEGORY_OPTIONS } from "@/constants/context-aware-data-collection";

/** @deprecated Prefer APPROX_CIBIL_SCORE_OPTIONS — kept as Analyze Deal alias. */
export const ANALYZE_DEAL_CIBIL_OPTIONS = APPROX_CIBIL_SCORE_OPTIONS;

export type { ApproxCibilScoreBand as AnalyzeDealCibilBand };

export const ANALYZE_DEAL_CUSTOMER_CATEGORIES: ReadonlyArray<{
  value: AnalyzeDealCustomerCategory;
  label: string;
}> = CONTEXT_CUSTOMER_CATEGORY_OPTIONS.filter(
  (o): o is {
    value: AnalyzeDealCustomerCategory;
    label: string;
    family: "salaried" | "self_employed";
  } =>
    o.value === "salaried" ||
    o.value === "self_employed_professional" ||
    o.value === "self_employed_business" ||
    o.value === "nri",
).map((o) => ({ value: o.value, label: o.label }));

export const ANALYZE_DEAL_PRODUCTS: ReadonlyArray<{
  id: string;
  label: string;
  propertyRelevant: boolean;
}> = [
  { id: "home-loan", label: "Home Loan", propertyRelevant: true },
  { id: "lap", label: "Loan Against Property", propertyRelevant: true },
  { id: "business-loan", label: "Business Loan", propertyRelevant: false },
  { id: "working-capital", label: "Working Capital", propertyRelevant: false },
  { id: "construction-finance", label: "Construction Finance", propertyRelevant: true },
];

export const ANALYZE_DEAL_LOW_SCORE_QUESTIONS: ReadonlyArray<{
  key: keyof AnalyzeDealInputs["lowScore"];
  label: string;
}> = [
  { key: "activeOverdue", label: "Active overdue?" },
  { key: "loanOverdue", label: "Loan overdue?" },
  { key: "creditCardOverdue", label: "Credit Card overdue?" },
  { key: "settledAccount", label: "Settled account?" },
  { key: "writtenOffAccount", label: "Written-off account?" },
];

export function createEmptyAnalyzeDealInputs(defaults?: {
  productId?: string;
  productLabel?: string;
}): AnalyzeDealInputs {
  const product =
    ANALYZE_DEAL_PRODUCTS.find((p) => p.id === defaults?.productId) ??
    ANALYZE_DEAL_PRODUCTS[0];
  return {
    productId: defaults?.productId ?? product.id,
    productLabel: defaults?.productLabel ?? product.label,
    customerCategory: "",
    requestedAmount: "",
    propertyValue: "",
    monthlyIncome: "",
    employer: "",
    salaryCredits: "",
    businessTurnover: "",
    businessVintage: "",
    gst: "",
    itr: "",
    banking: "",
    profit: "",
    rentalIncome: "",
    existingEmi: "",
    cibilBand: "",
    lowScore: {
      activeOverdue: null,
      loanOverdue: null,
      creditCardOverdue: null,
      settledAccount: null,
      writtenOffAccount: null,
    },
    notes: "",
  };
}

export function shouldRevealLowScoreQuestions(
  band: ApproxCibilScoreBand | "",
): boolean {
  return sharedShouldRevealLowScoreQuestions(band);
}

export function isPropertyFieldApplicable(productId: string): boolean {
  return ANALYZE_DEAL_PRODUCTS.find((p) => p.id === productId)?.propertyRelevant ?? false;
}

/** Clear opposite-family values when Customer Category changes. */
export function applyAnalyzeDealCategoryChange(
  prev: AnalyzeDealInputs,
  nextCategory: AnalyzeDealCustomerCategory | "",
): AnalyzeDealInputs {
  const base = { ...prev, customerCategory: nextCategory };
  if (!nextCategory) return base;
  const isSe =
    nextCategory === "self_employed_professional" ||
    nextCategory === "self_employed_business";
  if (isSe) {
    return {
      ...base,
      monthlyIncome: "",
      employer: "",
      salaryCredits: "",
    };
  }
  return {
    ...base,
    businessTurnover: "",
    businessVintage: "",
    gst: "",
    itr: "",
    banking: "",
    profit: "",
    rentalIncome: "",
  };
}
