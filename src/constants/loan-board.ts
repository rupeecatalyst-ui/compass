import { STAGE_COLORS } from "@/constants/loan-pipeline";
import type { PipelineStage } from "@/types/catalyst-one";

/**
 * Stage taxonomy retained for Dashboard funnel / treemap analytics.
 * The obsolete Loan Board workspace UI was removed (CO-ARCH-REVIEW).
 */
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
  if (product === "Construction Finance" || product === "Construction Funding") return "Construction Finance";
  return "Others";
}
