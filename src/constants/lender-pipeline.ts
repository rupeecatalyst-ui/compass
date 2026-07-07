import type { LenderCaseStage, LenderLostReason, LenderProbability } from "@/types/catalyst-one";

/** UX-04D — Frozen enterprise lender pipeline stages. */
export const LENDER_CASE_STAGES: { id: LenderCaseStage; label: string; color: string }[] = [
  { id: "prelogin", label: "Prelogin", color: "#94A3B8" },
  { id: "logged_in_wip", label: "Logged In – WIP", color: "#3B82F6" },
  { id: "soft_approved", label: "Soft Approved", color: "#8B5CF6" },
  { id: "final_approved", label: "Final Approved", color: "#10B981" },
  { id: "closure_wip", label: "Closure WIP", color: "#F59E0B" },
  { id: "disbursed", label: "Disbursed", color: "#06B6D4" },
  { id: "lost", label: "Lost", color: "#EF4444" },
  { id: "hold", label: "Hold", color: "#64748B" },
] as const;

export const LENDER_CASE_STAGE_LABELS: Record<LenderCaseStage, string> = Object.fromEntries(
  LENDER_CASE_STAGES.map((s) => [s.id, s.label]),
) as Record<LenderCaseStage, string>;

export const LENDER_CASE_STAGE_COLORS: Record<LenderCaseStage, string> = Object.fromEntries(
  LENDER_CASE_STAGES.map((s) => [s.id, s.color]),
) as Record<LenderCaseStage, string>;

export const LENDER_LOST_REASONS: { id: LenderLostReason; label: string }[] = [
  { id: "rejected", label: "Rejected" },
  { id: "customer_declined", label: "Customer Declined" },
  { id: "better_offer", label: "Better Offer" },
  { id: "eligibility", label: "Eligibility" },
  { id: "documentation", label: "Documentation" },
  { id: "duplicate", label: "Duplicate" },
  { id: "other", label: "Other" },
];

export const LENDER_PROBABILITY_LABELS: Record<LenderProbability, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  very_low: "Very Low",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const LEGACY_STAGE_MAP: Record<string, LenderCaseStage> = {
  raw_lead: "prelogin",
  login: "logged_in_wip",
  credit: "logged_in_wip",
  bank_query: "logged_in_wip",
  sanction: "soft_approved",
  disbursement: "closure_wip",
  rejected: "lost",
  withdrawn: "lost",
};

export function normalizeLenderCaseStage(stage?: string): LenderCaseStage {
  if (!stage) return "prelogin";
  if (LENDER_CASE_STAGE_LABELS[stage as LenderCaseStage]) {
    return stage as LenderCaseStage;
  }
  return LEGACY_STAGE_MAP[stage] ?? "prelogin";
}

export function getProbabilityStyle(p?: LenderProbability): { className: string } {
  switch (p) {
    case "very_high":
      return { className: "bg-emerald-600/10 text-emerald-800 border-emerald-600/25 dark:text-emerald-200" };
    case "high":
      return { className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-200" };
    case "medium":
      return { className: "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-200" };
    case "low":
      return { className: "bg-blue-500/10 text-blue-800 border-blue-500/25 dark:text-blue-200" };
    case "very_low":
      return { className: "bg-muted/40 text-muted-foreground border-border" };
    case "rejected":
      return { className: "bg-destructive/10 text-destructive border-destructive/25" };
    case "withdrawn":
      return { className: "bg-muted/50 text-muted-foreground border-border" };
    default:
      return { className: "bg-muted/30 text-muted-foreground border-border" };
  }
}
