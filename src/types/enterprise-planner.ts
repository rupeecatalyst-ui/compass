/**
 * CO-TASKS-PLANNER-001A — Enterprise Planner DTOs.
 * Projection of Enterprise Task Registry — never a second task store.
 */

export type PlannerViewMode = "agenda" | "day" | "week" | "month";

/** Operational activity taxonomy (presentation). */
export type PlannerActivityType =
  | "customer_call"
  | "document_collection"
  | "bank_follow_up"
  | "customer_meeting"
  | "site_visit"
  | "disbursement"
  | "sanction_follow_up"
  | "email_follow_up"
  | "internal_task";

/** Shared Tasks ↔ Planner schedule colour philosophy. */
export type PlannerScheduleTone =
  | "completed"
  | "scheduled"
  | "due_today"
  | "due_tomorrow"
  | "overdue"
  | "cancelled";

export type PlannerEventSource =
  | "ete_task"
  | "meeting_registry"
  | "reminder_registry"
  | "workflow_event"
  | "campaign";

export type PlannerEventStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "overdue"
  | "due_today"
  | "due_tomorrow";

/**
 * Enterprise Planner Event — presentation DTO only.
 * taskId links to ETE when source is ete_task.
 */
export type EnterprisePlannerEvent = {
  id: string;
  source: PlannerEventSource;
  title: string;
  /** Customer / borrower display name */
  customerName?: string;
  activityType: PlannerActivityType;
  activityLabel: string;
  activityIcon: string;
  opportunityRef?: string;
  opportunityId?: string;
  contactId?: string;
  /** ISO start / due */
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  timeLabel: string;
  dueDateLabel: string;
  priority?: "critical" | "high" | "medium" | "low";
  assigneeRef?: string;
  assigneeLabel: string;
  scheduleTone: PlannerScheduleTone;
  status: PlannerEventStatus;
  notes?: string;
  /** Linked ETE task — SSOT for reschedule */
  taskId?: string;
  entityKind?: string;
  entityId?: string;
  entityLabel?: string;
  canReschedule: boolean;
  rescheduleBlockReason?: string;
  externalCalendarHint?: "google" | "outlook" | "none";
  /** @deprecated use activityType — kept for older kind consumers */
  kind?: string;
  subtitle?: string;
  /** Recurring series projection (from ETE). */
  scheduleKind?: "one_time" | "recurring";
  seriesId?: string;
  occurrenceNumber?: number;
  recurrenceLabel?: string;
  /**
   * Virtual future occurrence projected from a recurring ETE series for calendar display.
   * Not a separate registry row — Planner remains ETE SSOT.
   */
  isProjectedOccurrence?: boolean;
  /** True when dueOn was missing and Planner used a fallback date for visibility. */
  needsSchedule?: boolean;
};

export type PlannerAgendaSectionId =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "upcoming";

export type EnterprisePlannerAgendaSection = {
  id: PlannerAgendaSectionId;
  label: string;
  events: EnterprisePlannerEvent[];
};

/** @deprecated — prefer EnterprisePlannerAgendaSection */
export type EnterprisePlannerAgendaDay = {
  dateKey: string;
  label: string;
  isToday: boolean;
  events: EnterprisePlannerEvent[];
};

export type EnterprisePlannerSnapshot = {
  asOf: string;
  rangeStart: string;
  rangeEnd: string;
  viewMode: PlannerViewMode;
  focusDate: string;
  events: EnterprisePlannerEvent[];
  /** Agenda operational sections (001A) */
  agendaSections: EnterprisePlannerAgendaSection[];
  /** Legacy day buckets — still filled for compatibility */
  agenda: EnterprisePlannerAgendaDay[];
  counts: {
    todayMeetings: number;
    todayTasks: number;
    upcoming: number;
    overdue: number;
  };
  syncReadiness: {
    googleCalendar: "reserved";
    microsoftOutlook: "reserved";
  };
};

export type PlannerRescheduleResult =
  | {
      ok: true;
      taskId: string;
      previousDueOn?: string;
      nextDueOn: string;
    }
  | {
      ok: false;
      reason: string;
    };
