/**
 * CO-SPRINT-100 — CHANAKYA Radar Operational Intelligence constants.
 * Retires Matrix dual-view. Four operational quadrants + scope model.
 */

import { ROUTES } from "@/constants/routes";
import type { Role } from "@/constants/roles";
import { ROLES } from "@/constants/roles";

export const CHANAKYA_RADAR_OFFICIAL_NAME = "CHANAKYA Radar";

export const CHANAKYA_RADAR_STATUS_LINE =
  "Operational intelligence — portfolio health, direction, and immediate priorities.";

/** Four operational quadrants (compass). */
export type ChanakyaOperationalQuadrantId =
  | "on_track"
  | "needs_attention"
  | "follow_up_required"
  | "at_risk";

/** @deprecated Legacy 6-bucket health — prefer ChanakyaOperationalQuadrantId. */
export type ChanakyaDealHealthId =
  | ChanakyaOperationalQuadrantId
  | "dormant"
  | "on_hold"
  | "completed";

export type ChanakyaRadarScopeId = "my_portfolio" | "my_team" | "entire_organization";

export const CHANAKYA_RADAR_SCOPES: {
  id: ChanakyaRadarScopeId;
  label: string;
  /** Minimum role hierarchy level required (ROLE_HIERARCHY). */
  minRoleLevel: number;
}[] = [
  { id: "my_portfolio", label: "My Portfolio", minRoleLevel: 0 },
  { id: "my_team", label: "My Team", minRoleLevel: 40 },
  { id: "entire_organization", label: "Entire Organization", minRoleLevel: 60 },
];

/**
 * CO-SPRINT-107 — Stage-ageing ring model (Enterprise Configuration).
 * Farther from centre = longer unresolved in current stage.
 * Thresholds are configuration — never hardcode in placement UI.
 */
export interface ChanakyaRadarAgeingRingDef {
  id: string;
  label: string;
  /** Inclusive lower bound (days in stage / idle). */
  minDays: number;
  /** Inclusive upper bound; omit for open-ended outer ring. */
  maxDays?: number;
}

export const CHANAKYA_RADAR_AGEING_RINGS: ChanakyaRadarAgeingRingDef[] = [
  { id: "ring_1", label: "Very Recent", minDays: 0, maxDays: 3 },
  { id: "ring_2", label: "Emerging", minDays: 4, maxDays: 7 },
  { id: "ring_3", label: "Elevated", minDays: 8, maxDays: 15 },
  { id: "ring_4", label: "Extended", minDays: 16, maxDays: 30 },
  { id: "ring_5", label: "Critical Ageing", minDays: 31 },
];

/** Geometry + collision policy for Radar blip placement (Enterprise Configuration). */
export const CHANAKYA_RADAR_PLACEMENT = {
  centerX: 100,
  centerY: 100,
  /** Usable radius band for opportunity dots (SVG viewBox units). */
  innerRadius: 36,
  outerRadius: 84,
  /** Half-width of each quadrant wedge used for angular layout (degrees). */
  wedgeHalfDeg: 38,
  /** Controlled radial jitter within a ring (± fraction of ring band width). */
  radialJitterFraction: 0.045,
  /** Minimum Euclidean distance between dots (scales slightly with density). */
  minDistanceBase: 5.2,
  minDistanceDense: 3.6,
  denseCountThreshold: 40,
  /** Angular step when resolving collisions (degrees). */
  collisionAngleStepDeg: 2.4,
  maxCollisionAttempts: 48,
} as const;

export function resolveChanakyaRadarAgeingRingIndex(days: number): number {
  const d = Math.max(0, Math.floor(days));
  const rings = CHANAKYA_RADAR_AGEING_RINGS;
  for (let i = 0; i < rings.length; i += 1) {
    const ring = rings[i]!;
    const max = ring.maxDays;
    if (max == null) {
      if (d >= ring.minDays) return i;
      continue;
    }
    if (d >= ring.minDays && d <= max) return i;
  }
  return rings.length - 1;
}

/**
 * CO-SPRINT-108 — Activities that qualify as Meaningful / Operational Work.
 * Enterprise Configuration — do not hardcode in UI. Toggle `enabled` or edit patterns.
 */
export interface ChanakyaRadarMeaningfulWorkActivityDef {
  id: string;
  label: string;
  enabled: boolean;
  /** Case-insensitive substrings matched against timeline title + description. */
  matchPatterns: string[];
}

export const CHANAKYA_RADAR_MEANINGFUL_WORK_ACTIVITIES: ChanakyaRadarMeaningfulWorkActivityDef[] =
  [
    {
      id: "call_completed",
      label: "Call completed",
      enabled: true,
      matchPatterns: ["call completed", "call —", "phone call", "outbound call"],
    },
    {
      id: "customer_meeting",
      label: "Customer meeting logged",
      enabled: true,
      matchPatterns: ["meeting", "customer visit", "site visit"],
    },
    {
      id: "note_added",
      label: "Note added",
      enabled: true,
      matchPatterns: ["note added", "internal note", "rm note", "timeline note"],
    },
    {
      id: "follow_up_completed",
      label: "Follow-up completed",
      enabled: true,
      matchPatterns: ["follow-up", "follow up", "followup"],
    },
    {
      id: "document_uploaded",
      label: "Document uploaded",
      enabled: true,
      matchPatterns: ["document", "upload", "checklist"],
    },
    {
      id: "workflow_stage_updated",
      label: "Workflow stage updated",
      enabled: true,
      matchPatterns: ["stage", "workflow", "status change", "moved to"],
    },
    {
      id: "task_completed",
      label: "Task completed",
      enabled: true,
      matchPatterns: ["task activity", "task completed", "task closed"],
    },
    {
      id: "communication_sent",
      label: "Customer communication sent",
      enabled: true,
      matchPatterns: ["email sent", "whatsapp sent", "sms sent"],
    },
    {
      id: "lender_pipeline_updated",
      label: "Lender pipeline updated",
      enabled: true,
      matchPatterns: ["lender pipeline", "lender case", "pipeline"],
    },
    {
      id: "operational_work",
      label: "Tagged operational work",
      enabled: true,
      matchPatterns: ["operational work", "[operational_work]"],
    },
  ];

/**
 * Patterns that must NEVER create the Daily Work ✓ (view / navigate only).
 */
export const CHANAKYA_RADAR_NON_OPERATIONAL_ACTIVITY_PATTERNS: string[] = [
  "opened",
  "viewed",
  "accessed",
  "preview",
  "navigated",
  "loaded workspace",
  "selected opportunity",
];

export function canUseRadarScope(scope: ChanakyaRadarScopeId, role?: Role | string | null): boolean {
  const def = CHANAKYA_RADAR_SCOPES.find((s) => s.id === scope);
  if (!def) return false;
  if (!role) return scope === "my_portfolio";
  const level =
    role === ROLES.SUPER_ADMIN
      ? 100
      : role === ROLES.ADMIN
        ? 80
        : role === ROLES.MANAGER
          ? 60
          : role === ROLES.ANALYST
            ? 40
            : 20;
  return level >= def.minRoleLevel;
}

export type ChanakyaCompassDirectionId =
  | "North"
  | "North-East"
  | "East"
  | "South-East"
  | "South"
  | "South-West"
  | "West"
  | "North-West";

export type ChanakyaHealthTrendId = "Improving" | "Stable" | "Declining";

export interface ChanakyaRadarQuadrantDef {
  id: ChanakyaOperationalQuadrantId;
  label: string;
  /** Compass bearing in degrees from North (clockwise). */
  bearingDeg: number;
  tone: string;
  toneClass: string;
  surfaceClass: string;
}

export const CHANAKYA_RADAR_QUADRANTS: ChanakyaRadarQuadrantDef[] = [
  {
    id: "on_track",
    label: "On Track",
    bearingDeg: 0,
    tone: "#22C55E",
    toneClass: "text-emerald-400",
    surfaceClass: "border-emerald-500/40 bg-emerald-500/10",
  },
  {
    id: "follow_up_required",
    label: "Follow-up Required",
    bearingDeg: 90,
    tone: "#3B82F6",
    toneClass: "text-sky-400",
    surfaceClass: "border-sky-500/40 bg-sky-500/10",
  },
  {
    id: "at_risk",
    label: "At Risk",
    bearingDeg: 180,
    tone: "#EF4444",
    toneClass: "text-rose-400",
    surfaceClass: "border-rose-500/40 bg-rose-500/10",
  },
  {
    id: "needs_attention",
    label: "Needs Attention",
    bearingDeg: 270,
    tone: "#F59E0B",
    toneClass: "text-amber-400",
    surfaceClass: "border-amber-500/40 bg-amber-500/10",
  },
];

export type ChanakyaRadarActionTabId =
  | "at_risk"
  | "high_value"
  | "follow_up_today"
  | "stalled"
  | "approval_pending"
  | "document_pending";

export const CHANAKYA_RADAR_ACTION_TABS: { id: ChanakyaRadarActionTabId; label: string }[] = [
  { id: "at_risk", label: "At Risk" },
  { id: "high_value", label: "High Value" },
  { id: "follow_up_today", label: "Follow-up Today" },
  { id: "stalled", label: "Stalled" },
  { id: "approval_pending", label: "Approval Pending" },
  { id: "document_pending", label: "Document Pending" },
];

export type ChanakyaRadarQuickActionId =
  | "follow_up_today"
  | "risk_alerts"
  | "pending_documents"
  | "approvals_pending";

export const CHANAKYA_RADAR_QUICK_ACTIONS: {
  id: ChanakyaRadarQuickActionId;
  label: string;
  tab: ChanakyaRadarActionTabId;
}[] = [
  { id: "follow_up_today", label: "Follow-up Today", tab: "follow_up_today" },
  { id: "risk_alerts", label: "Risk Alerts", tab: "at_risk" },
  { id: "pending_documents", label: "Pending Documents", tab: "document_pending" },
  { id: "approvals_pending", label: "Approvals Pending", tab: "approval_pending" },
];

/** Active Workspace — retained for legacy card routing helpers. */
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
    toneClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-50",
  },
};

/** @deprecated Matrix retired — kept for migration of saved view state. */
export type ChanakyaRadarViewId = "matrix" | "kanban" | "dashboard";

export const CHANAKYA_RADAR_FILTER_ALL = "all";

export const CHANAKYA_RADAR_EXCLUDED_LENDER_STAGES = new Set(["lost"]);
export const CHANAKYA_RADAR_EXCLUDED_PROBABILITIES = new Set(["rejected", "withdrawn"]);

/** Legacy column defs — map dormant → follow_up for old helpers. */
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
    headerClass: "bg-emerald-500/[0.08]",
  },
  {
    id: "needs_attention",
    label: "Needs Attention",
    emoji: "🟡",
    tone: "#F59E0B",
    headerClass: "bg-amber-500/[0.08]",
  },
  {
    id: "follow_up_required",
    label: "Follow-up Required",
    emoji: "🔵",
    tone: "#3B82F6",
    headerClass: "bg-sky-500/[0.08]",
  },
  {
    id: "at_risk",
    label: "At Risk",
    emoji: "🔴",
    tone: "#EF4444",
    headerClass: "bg-rose-500/[0.08]",
  },
  {
    id: "dormant",
    label: "Dormant",
    emoji: "😴",
    tone: "#8B5CF6",
    headerClass: "bg-violet-500/[0.08]",
  },
  {
    id: "on_hold",
    label: "On Hold",
    emoji: "⏸",
    tone: "#64748B",
    headerClass: "bg-slate-500/[0.08]",
  },
  {
    id: "completed",
    label: "Completed",
    emoji: "✅",
    tone: "#059669",
    headerClass: "bg-emerald-600/[0.08]",
  },
];

/** @deprecated Matrix retired. */
export type ChanakyaRadarMatrixHealthId = ChanakyaOperationalQuadrantId;

/** @deprecated Matrix retired. */
export const CHANAKYA_RADAR_MATRIX_CARDS = CHANAKYA_RADAR_QUADRANTS.map((q) => ({
  id: q.id as ChanakyaRadarMatrixHealthId,
  label: q.label,
  emoji: "",
  tone: q.tone,
  description: q.label,
  surfaceClass: q.surfaceClass,
}));

/** @deprecated */
export const CHANAKYA_RADAR_VIEWS: { id: ChanakyaRadarViewId; label: string }[] = [
  { id: "dashboard", label: "Radar" },
];
