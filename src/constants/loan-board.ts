import { STAGE_COLORS } from "@/constants/loan-pipeline";
import type { PipelineStage } from "@/types/catalyst-one";

/** Executive Loan Board — active pipeline columns (Won excluded — completed). */
export const LOAN_BOARD_STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: "raw_lead", label: "Raw Lead", color: STAGE_COLORS.raw_lead },
  { id: "pre_login", label: "Pre Login", color: STAGE_COLORS.pre_login },
  { id: "logged_in", label: "Logged In", color: STAGE_COLORS.logged_in },
  { id: "credit_wip", label: "Credit WIP", color: STAGE_COLORS.credit_wip },
  { id: "soft_approved", label: "Soft Approved", color: STAGE_COLORS.soft_approved },
  { id: "final_approved", label: "Final Approved", color: STAGE_COLORS.final_approved },
  { id: "closure_wip", label: "Closure WIP", color: STAGE_COLORS.closure_wip },
];

export const LOAN_BOARD_STAGE_IDS = LOAN_BOARD_STAGES.map((s) => s.id);

export const LOAN_BOARD_STAGE_COLORS: Record<PipelineStage, string> = {
  ...STAGE_COLORS,
};

export const LOAN_BOARD_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  LOAN_BOARD_STAGES.map((s) => [s.id, s.label]),
);

export type LoanBoardDensity = "compact" | "medium" | "large";

export type LoanBoardFieldKey =
  | "customer"
  | "company"
  | "mobile"
  | "product"
  | "loanAmount"
  | "sanctionAmount"
  | "lender"
  | "lenderLogo"
  | "rm"
  | "city"
  | "source"
  | "priority"
  | "ageing"
  | "lastActivity"
  | "nextFollowup"
  | "revenue"
  | "expectedPayout";

export const LOAN_BOARD_FIELD_LABELS: Record<LoanBoardFieldKey, string> = {
  customer: "Customer",
  company: "Company",
  mobile: "Mobile",
  product: "Product",
  loanAmount: "Loan Amount",
  sanctionAmount: "Sanction Amount",
  lender: "Lender",
  lenderLogo: "Lender Logo",
  rm: "RM",
  city: "City",
  source: "Source",
  priority: "Priority",
  ageing: "Ageing",
  lastActivity: "Last Activity",
  nextFollowup: "Next Follow-up",
  revenue: "Revenue",
  expectedPayout: "Expected Payout",
};

export const DEFAULT_LOAN_BOARD_FIELDS: LoanBoardFieldKey[] = [
  "customer",
  "loanAmount",
  "revenue",
  "product",
  "lenderLogo",
  "lender",
  "rm",
  "priority",
  "ageing",
];

export const LOAN_BOARD_SAVED_VIEWS = [
  { id: "all", label: "All Files" },
  { id: "my_files", label: "My Files" },
  { id: "todays_followups", label: "Today's Follow-ups" },
  { id: "high_value", label: "High Value" },
  { id: "home_loans", label: "Home Loans" },
  { id: "business_loans", label: "Business Loans" },
  { id: "credit_wip", label: "Credit WIP" },
  { id: "management", label: "Management View" },
] as const;

export const PRODUCT_TREEMAP_CATEGORIES = [
  "Home Loan",
  "Business Loan",
  "LAP",
  "Personal Loan",
  "Working Capital",
  "Construction Finance",
  "Others",
] as const;

export type ProductTreemapCategory = (typeof PRODUCT_TREEMAP_CATEGORIES)[number];

export function mapProductToTreemapCategory(product: string): ProductTreemapCategory {
  if (product.includes("Home Loan")) return "Home Loan";
  if (product.includes("Business Loan")) return "Business Loan";
  if (product === "Loan Against Property") return "LAP";
  if (product === "Personal Loan") return "Personal Loan";
  if (product === "Working Capital") return "Working Capital";
  if (product === "Construction Finance") return "Construction Finance";
  return "Others";
}
