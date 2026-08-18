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
  {
    id: "post_disbursement_confirmation",
    label: "Post-disbursement Confirmation",
    color: "#0F766E",
  },
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

/** Deal Registry priority → Kanban badge (SSOT display only). */
export const DEAL_PRIORITY_KANBAN_LABELS: Record<string, string> = {
  urgent: "Very High",
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function dealPriorityKanbanTone(priority?: string | null): {
  label: string;
  className: string;
} {
  const key = (priority ?? "medium").trim().toLowerCase();
  const label = DEAL_PRIORITY_KANBAN_LABELS[key] ?? "Medium";
  if (key === "urgent" || key === "very_high") {
    return {
      label,
      className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }
  if (key === "high") {
    return {
      label,
      className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    };
  }
  if (key === "low") {
    return {
      label,
      className: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
    };
  }
  return {
    label: DEAL_PRIORITY_KANBAN_LABELS.medium,
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  };
}

/** Deal Health Score tone — Green ≥80 · Amber 60–79 · Red &lt;60. */
export function dealHealthScoreKanbanTone(score: number | null | undefined): {
  label: string;
  className: string;
  dot: string;
} {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return {
      label: "—",
      className: "text-muted-foreground",
      dot: "bg-muted-foreground/50",
    };
  }
  const label = `${Math.round(score)}%`;
  if (score >= 80) {
    return {
      label,
      className: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }
  if (score >= 60) {
    return {
      label,
      className: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }
  return {
    label,
    className: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  };
}

export function formatKanbanCardDate(iso?: string | null): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Historical Disbursed rows may lack disbursedAt — never substitute updatedAt. */
export const DISBURSED_DATE_UNAVAILABLE_LABEL = "Disbursed date unavailable";

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
 * Kanban timestamp lines. Disbursed date is disbursedAt only; Updated remains updatedAt.
 * Non-Disbursed stages do not surface a Disbursed line.
 */
export function resolveKanbanCardTimestampLines(input: {
  caseStage?: string | null;
  updatedAt?: string | null;
  disbursedAt?: string | null;
}): {
  updatedLabel: string;
  showDisbursedDate: boolean;
  disbursedValue: string | null;
} {
  const stage = normalizeLenderCaseStage(input.caseStage ?? undefined);
  const updatedLabel = formatKanbanCardDate(input.updatedAt) || "—";
  if (stage !== "disbursed") {
    return { updatedLabel, showDisbursedDate: false, disbursedValue: null };
  }
  const formatted = formatKanbanCardDate(input.disbursedAt);
  return {
    updatedLabel,
    showDisbursedDate: true,
    disbursedValue: formatted || DISBURSED_DATE_UNAVAILABLE_LABEL,
  };
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
