import type { LenderCaseStage, LenderLostReason, LenderProbability } from "@/types/catalyst-one";

/** UX-04D / CO-SPRINT-089 — Frozen enterprise lender pipeline stages.
 * Colours aligned to CO-UX-003 Enterprise Journey standard.
 */
export const LENDER_CASE_STAGES: { id: LenderCaseStage; label: string; color: string }[] = [
  { id: "identified", label: "Identified", color: "#94A3B8" },
  { id: "prelogin", label: "Pre Login", color: "#94A3B8" },
  { id: "logged_in_wip", label: "Logged In – WIP", color: "#2563EB" },
  { id: "soft_approved", label: "Soft Approved", color: "#EAB308" },
  { id: "final_approved", label: "Final Approved", color: "#86EFAC" },
  { id: "closure_wip", label: "Closure WIP", color: "#22C55E" },
  { id: "disbursed", label: "Disbursed", color: "#14532D" },
  { id: "lost", label: "Lost", color: "#EF4444" },
  { id: "hold", label: "Hold", color: "#F97316" },
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
  // Legacy PipelineStage → canonical LenderCaseStage (read-only normalize)
  raw_lead: "identified",
  pre_login: "prelogin",
  logged_in: "logged_in_wip",
  login: "logged_in_wip",
  credit_wip: "logged_in_wip",
  credit: "logged_in_wip",
  bank_query: "logged_in_wip",
  sanction: "soft_approved",
  soft_approval: "soft_approved",
  final_approval: "final_approved",
  disbursement: "closure_wip",
  won: "disbursed",
  rejected: "lost",
  withdrawn: "lost",
};

export function normalizeLenderCaseStage(stage?: string): LenderCaseStage {
  if (!stage) return "identified";
  const key = stage.trim().toLowerCase().replace(/\s+/g, "_");
  if (LENDER_CASE_STAGE_LABELS[key as LenderCaseStage]) {
    return key as LenderCaseStage;
  }
  return LEGACY_STAGE_MAP[key] ?? "identified";
}

/**
 * Strict canonicalize — returns null for unknown tokens (does not default).
 * Used by server transition validation (CO-INC-001A).
 */
export function tryCanonicalLenderCaseStage(
  stage: string | null | undefined,
): LenderCaseStage | null {
  if (!stage?.trim()) return null;
  const key = stage.trim().toLowerCase().replace(/\s+/g, "_");
  if (LENDER_CASE_STAGE_LABELS[key as LenderCaseStage]) {
    return key as LenderCaseStage;
  }
  return LEGACY_STAGE_MAP[key] ?? null;
}

/** Stages that have not entered login execution yet. */
export function isPreExecutionStage(stage?: string): boolean {
  return normalizeLenderCaseStage(stage) === "identified";
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
