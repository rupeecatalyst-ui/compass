import type { LenderCaseStage, LenderProbability } from "@/types/catalyst-one";

export const LENDER_CASE_STAGES: { id: LenderCaseStage; label: string; color: string }[] = [
  { id: "raw_lead", label: "Raw Lead", color: "#94A3B8" },
  { id: "login", label: "Login", color: "#3B82F6" },
  { id: "credit", label: "Credit", color: "#F59E0B" },
  { id: "bank_query", label: "Bank Query", color: "#A855F7" },
  { id: "sanction", label: "Sanction", color: "#10B981" },
  { id: "disbursement", label: "Disbursement", color: "#06B6D4" },
  { id: "rejected", label: "Rejected", color: "#EF4444" },
  { id: "withdrawn", label: "Withdrawn", color: "#64748B" },
] as const;

export const LENDER_CASE_STAGE_LABELS: Record<LenderCaseStage, string> = Object.fromEntries(
  LENDER_CASE_STAGES.map((s) => [s.id, s.label]),
) as Record<LenderCaseStage, string>;

export const LENDER_CASE_STAGE_COLORS: Record<LenderCaseStage, string> = Object.fromEntries(
  LENDER_CASE_STAGES.map((s) => [s.id, s.color]),
) as Record<LenderCaseStage, string>;

export const LENDER_PROBABILITY_LABELS: Record<LenderProbability, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  very_low: "Very Low",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

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

