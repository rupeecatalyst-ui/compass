/**
 * CHANAKYA Radar — Deal Health board (not workflow stages).
 */

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

export interface ChanakyaRadarColumnDef {
  id: ChanakyaDealHealthId;
  label: string;
  emoji: string;
  tone: string;
  headerClass: string;
}

export const CHANAKYA_RADAR_COLUMNS: ChanakyaRadarColumnDef[] = [
  {
    id: "on_track",
    label: "On Track",
    emoji: "🟢",
    tone: "#22C55E",
    headerClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  },
  {
    id: "needs_attention",
    label: "Needs Attention",
    emoji: "🟡",
    tone: "#EAB308",
    headerClass: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  },
  {
    id: "at_risk",
    label: "At Risk",
    emoji: "🔴",
    tone: "#EF4444",
    headerClass: "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-100",
  },
  {
    id: "dormant",
    label: "Dormant",
    emoji: "😴",
    tone: "#64748B",
    headerClass: "border-slate-500/30 bg-slate-500/10 text-slate-900 dark:text-slate-100",
  },
  {
    id: "on_hold",
    label: "On Hold",
    emoji: "⏸",
    tone: "#F59E0B",
    headerClass: "border-orange-500/30 bg-orange-500/10 text-orange-950 dark:text-orange-100",
  },
  {
    id: "completed",
    label: "Completed",
    emoji: "✅",
    tone: "#0F766E",
    headerClass: "border-teal-500/30 bg-teal-500/10 text-teal-950 dark:text-teal-100",
  },
];

/** Lender case stages that must never appear on Radar cards. */
export const CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES = new Set([
  "lost",
]);

export const CHANAKYA_RADAR_EXCLUDED_PROBABILITIES = new Set([
  "rejected",
  "withdrawn",
]);
