/**
 * CO-TASKS-PLANNER-001A — Planner presentation constants.
 * Colour philosophy shared with Tasks Workspace.
 */

import type {
  PlannerActivityType,
  PlannerAgendaSectionId,
  PlannerScheduleTone,
  PlannerViewMode,
} from "@/types/enterprise-planner";

export const PLANNER_VIEW_MODES: { id: PlannerViewMode; label: string }[] = [
  { id: "agenda", label: "Agenda" },
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export const PLANNER_DEFAULT_VIEW: PlannerViewMode = "agenda";

export const PLANNER_DAY_START_HOUR = 8;
export const PLANNER_DAY_END_HOUR = 20;

export const PLANNER_ACTIVITY_META: Record<
  PlannerActivityType,
  { label: string; icon: string }
> = {
  customer_call: { label: "Customer Call", icon: "📞" },
  document_collection: { label: "Document Collection", icon: "📄" },
  bank_follow_up: { label: "Bank Follow-up", icon: "🏦" },
  customer_meeting: { label: "Customer Meeting", icon: "👥" },
  site_visit: { label: "Site Visit", icon: "🏠" },
  disbursement: { label: "Disbursement", icon: "💰" },
  sanction_follow_up: { label: "Sanction Follow-up", icon: "📑" },
  email_follow_up: { label: "Email Follow-up", icon: "📧" },
  internal_task: { label: "Internal Task", icon: "📝" },
};

/** Shared Enterprise schedule colour system (Tasks ↔ Planner). */
export const PLANNER_SCHEDULE_TONE_META: Record<
  PlannerScheduleTone,
  { label: string; swatch: string; cardClass: string; chipClass: string }
> = {
  completed: {
    label: "Completed",
    swatch: "🟢",
    cardClass:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15",
    chipClass: "bg-emerald-500/20 text-emerald-200",
  },
  scheduled: {
    label: "Scheduled",
    swatch: "🔵",
    cardClass: "border-sky-500/40 bg-sky-500/10 text-sky-50 hover:bg-sky-500/15",
    chipClass: "bg-sky-500/20 text-sky-200",
  },
  due_today: {
    label: "Due Today",
    swatch: "🟡",
    cardClass:
      "border-amber-400/50 bg-amber-400/10 text-amber-50 hover:bg-amber-400/15",
    chipClass: "bg-amber-400/20 text-amber-100",
  },
  due_tomorrow: {
    label: "Due Tomorrow",
    swatch: "🟠",
    cardClass:
      "border-orange-500/45 bg-orange-500/10 text-orange-50 hover:bg-orange-500/15",
    chipClass: "bg-orange-500/20 text-orange-100",
  },
  overdue: {
    label: "Overdue",
    swatch: "🔴",
    cardClass: "border-rose-500/50 bg-rose-500/10 text-rose-50 hover:bg-rose-500/15",
    chipClass: "bg-rose-500/20 text-rose-100",
  },
  cancelled: {
    label: "Cancelled",
    swatch: "⚫",
    cardClass:
      "border-slate-500/40 bg-slate-700/40 text-slate-300 opacity-70 hover:bg-slate-700/50",
    chipClass: "bg-slate-600/40 text-slate-300",
  },
};

/** PO order: Today → Tomorrow → This Week → Overdue → Upcoming */
export const PLANNER_AGENDA_SECTIONS: {
  id: PlannerAgendaSectionId;
  label: string;
}[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
  { id: "upcoming", label: "Upcoming" },
];

/** @deprecated — use PLANNER_ACTIVITY_META */
export const PLANNER_EVENT_KIND_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(PLANNER_ACTIVITY_META).map(([k, v]) => [k, v.label]),
);

export const PLANNER_DND_MIME = "application/x-c1-planner-event";

export {
  PLANNER_CREATE_INTENTS,
  PLANNER_SCOPE_FILTERS,
  type PlannerCreateIntent,
  type PlannerCreateIntentId,
  type PlannerScopeFilter,
} from "./create-intents";
