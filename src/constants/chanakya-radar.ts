/**
 * CHANAKYA Radar — Dual View Framework (CO-SPRINT-082).
 * Matrix (executive) + Kanban (operational) share one filtered dataset.
 */

import { ROUTES } from "@/constants/routes";

export const CHANAKYA_RADAR_OFFICIAL_NAME = "CHANAKYA Radar";

export const CHANAKYA_RADAR_STATUS_LINE =
  "CHANAKYA is continuously monitoring active transactions and prioritising work based on deal health.";

export type ChanakyaDealHealthId =
  | "on_track"
  | "needs_attention"
  | "at_risk"
  | "dormant"
  | "on_hold"
  | "completed";

/** Dual view — Matrix (executive) | Kanban (operational). */
export type ChanakyaRadarViewId = "matrix" | "kanban";

export const CHANAKYA_RADAR_VIEWS: { id: ChanakyaRadarViewId; label: string }[] = [
  { id: "matrix", label: "Matrix View" },
  { id: "kanban", label: "Kanban View" },
];

/** Sentinel for “All …” filter options. */
export const CHANAKYA_RADAR_FILTER_ALL = "all";

/** Active Workspace — CHANAKYA routes the click here (Sprint 2). */
export type ChanakyaActiveWorkspaceId =
  | "strategic_bench"
  | "credit_bench"
  | "loan_workspace";

export type ChanakyaMomentumId = "improving" | "stable" | "declining";

export type ChanakyaAiPriority = "high" | "medium" | "low";

export const CHANAKYA_RADAR_WORKSPACES: Record<
  ChanakyaActiveWorkspaceId,
  { label: string; emoji: string; href: string; toneClass: string }
> = {
  strategic_bench: {
    label: "Strategic Bench",
    emoji: "🟣",
    href: ROUTES.OPPORTUNITY_WORKSPACE,
    toneClass: "border-violet-500/30 bg-violet-500/10 text-violet-900 dark:text-violet-100",
  },
  credit_bench: {
    label: "Credit Bench",
    emoji: "🔵",
    href: ROUTES.CREDIT_BENCH,
    toneClass: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  },
  loan_workspace: {
    label: "Loan Workspace",
    emoji: "🟢",
    href: ROUTES.LOAN_FILES,
    toneClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  },
};

export interface ChanakyaRadarColumnDef {
  id: ChanakyaDealHealthId;
  label: string;
  emoji: string;
  /** Deal Health solid colour — used for count pill background. */
  tone: string;
  /** Subtle header wash (icon + title area). */
  headerClass: string;
}

export const CHANAKYA_RADAR_COLUMNS: ChanakyaRadarColumnDef[] = [
  {
    id: "on_track",
    label: "On Track",
    emoji: "🟢",
    tone: "#22C55E",
    headerClass: "bg-emerald-500/[0.08] text-emerald-950 dark:text-emerald-50",
  },
  {
    id: "needs_attention",
    label: "Needs Attention",
    emoji: "🟡",
    tone: "#F59E0B",
    headerClass: "bg-amber-500/[0.08] text-amber-950 dark:text-amber-50",
  },
  {
    id: "at_risk",
    label: "At Risk",
    emoji: "🔴",
    tone: "#EF4444",
    headerClass: "bg-rose-500/[0.08] text-rose-950 dark:text-rose-50",
  },
  {
    id: "dormant",
    label: "Dormant",
    emoji: "😴",
    tone: "#8B5CF6",
    headerClass: "bg-violet-500/[0.08] text-violet-950 dark:text-violet-50",
  },
  {
    id: "on_hold",
    label: "On Hold",
    emoji: "⏸",
    tone: "#64748B",
    headerClass: "bg-slate-500/[0.08] text-slate-900 dark:text-slate-50",
  },
  {
    id: "completed",
    label: "Completed",
    emoji: "✅",
    tone: "#059669",
    headerClass: "bg-emerald-600/[0.08] text-emerald-950 dark:text-emerald-50",
  },
];

/** Executive Matrix — four primary health cards (layout order). */
export type ChanakyaRadarMatrixHealthId =
  | "on_track"
  | "needs_attention"
  | "dormant"
  | "at_risk";

export interface ChanakyaRadarMatrixCardDef {
  id: ChanakyaRadarMatrixHealthId;
  label: string;
  emoji: string;
  tone: string;
  description: string;
  surfaceClass: string;
}

export const CHANAKYA_RADAR_MATRIX_CARDS: ChanakyaRadarMatrixCardDef[] = [
  {
    id: "on_track",
    label: "On Track",
    emoji: "🟢",
    tone: "#22C55E",
    description: "Deals progressing within expected cadence and lender path.",
    surfaceClass: "border-emerald-500/35 bg-emerald-500/[0.06]",
  },
  {
    id: "needs_attention",
    label: "Needs Attention",
    emoji: "🟡",
    tone: "#F59E0B",
    description: "Idle gaps or soft blockers that need an RM touch this week.",
    surfaceClass: "border-amber-500/35 bg-amber-500/[0.06]",
  },
  {
    id: "dormant",
    label: "Dormant",
    emoji: "🟣",
    tone: "#8B5CF6",
    description: "No meaningful movement — revive or re-qualify the opportunity.",
    surfaceClass: "border-violet-500/35 bg-violet-500/[0.06]",
  },
  {
    id: "at_risk",
    label: "At Risk",
    emoji: "🔴",
    tone: "#EF4444",
    description: "High risk of slippage — intervene before the deal stalls.",
    surfaceClass: "border-rose-500/35 bg-rose-500/[0.06]",
  },
];

/** Lender case stages that must never appear on Radar cards. */
export const CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES = new Set(["lost"]);

export const CHANAKYA_RADAR_EXCLUDED_PROBABILITIES = new Set(["rejected", "withdrawn"]);
