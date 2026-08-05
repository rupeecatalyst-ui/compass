/**
 * CO-TASKS-PLANNER-001A — Project ETE → Planner DTOs (no second task store).
 * Planner is a presentation of the Enterprise Task Registry only.
 * CO-BUG-PLANNER-EMPTY — Include undated tasks + expand recurring occurrences into view range.
 */

import {
  PLANNER_ACTIVITY_META,
  PLANNER_AGENDA_SECTIONS,
  PLANNER_DEFAULT_VIEW,
} from "@/constants/enterprise-planner";
import {
  assigneeLabel,
  columnForTask,
  computeNextOccurrenceDueOn,
  describeEteRecurrence,
  isRecurringTask,
  listEteTasks,
  resolveTaskStatus,
  taskTitle,
} from "@/lib/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";
import type {
  EnterprisePlannerAgendaDay,
  EnterprisePlannerAgendaSection,
  EnterprisePlannerEvent,
  EnterprisePlannerSnapshot,
  PlannerActivityType,
  PlannerAgendaSectionId,
  PlannerEventStatus,
  PlannerScheduleTone,
  PlannerViewMode,
} from "@/types/enterprise-planner";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function resolvePlannerActivityType(task: {
  workType?: string;
  predefinedDescription?: string;
  title?: string;
  category?: string;
}): PlannerActivityType {
  const wt = (task.workType ?? "").toLowerCase();
  const pre = (task.predefinedDescription ?? "").toLowerCase();
  const title = (task.title ?? "").toLowerCase();
  const blob = `${wt} ${pre} ${title}`;

  if (blob.includes("document")) return "document_collection";
  if (blob.includes("email") || blob.includes("mail")) return "email_follow_up";
  if (blob.includes("site") || blob.includes("visit")) return "site_visit";
  if (blob.includes("disburs")) return "disbursement";
  if (blob.includes("sanction")) return "sanction_follow_up";
  if (
    blob.includes("bank") ||
    blob.includes("lender") ||
    pre.includes("follow-up lender")
  )
    return "bank_follow_up";
  if (blob.includes("meeting")) return "customer_meeting";
  if (
    blob.includes("customer call") ||
    blob.includes("call customer") ||
    wt.includes("customer call") ||
    pre.includes("call customer")
  )
    return "customer_call";
  if (blob.includes("customer") || blob.includes("follow-up"))
    return "customer_call";
  return "internal_task";
}

export function resolveScheduleTone(input: {
  status: string;
  column?: string;
  startsAt: string;
}): { tone: PlannerScheduleTone; status: PlannerEventStatus } {
  if (input.status === "completed") {
    return { tone: "completed", status: "completed" };
  }
  if (input.status === "cancelled") {
    return { tone: "cancelled", status: "cancelled" };
  }
  const col = input.column;
  if (col === "past_due") return { tone: "overdue", status: "overdue" };
  if (col === "due_today") return { tone: "due_today", status: "due_today" };
  if (col === "tomorrow") return { tone: "due_tomorrow", status: "due_tomorrow" };

  const due = startOfDay(new Date(input.startsAt));
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  if (due.getTime() < today.getTime()) return { tone: "overdue", status: "overdue" };
  if (due.getTime() === today.getTime()) return { tone: "due_today", status: "due_today" };
  if (due.getTime() === tomorrow.getTime())
    return { tone: "due_tomorrow", status: "due_tomorrow" };
  return { tone: "scheduled", status: "scheduled" };
}

function resolveOpportunityId(task: EteTask): string | undefined {
  const kind = (task.entityKind ?? "").toLowerCase();
  if (kind === "opportunity" && task.entityId?.trim()) return task.entityId.trim();
  if (task.opportunityRef?.trim()) return task.opportunityRef.trim();
  return undefined;
}

/** Fallback due for undated ETE tasks so Planner never silently drops registry rows. */
function resolvePlannerStartsAt(task: EteTask): { startsAt: string; needsSchedule: boolean } {
  if (task.dueOn?.trim()) {
    return { startsAt: task.dueOn.trim(), needsSchedule: false };
  }
  if (task.createdOn?.trim()) {
    return { startsAt: task.createdOn.trim(), needsSchedule: true };
  }
  const todayAt17 = startOfDay(new Date());
  todayAt17.setHours(17, 0, 0, 0);
  return { startsAt: todayAt17.toISOString(), needsSchedule: true };
}

function taskToPlannerEvent(
  task: EteTask,
  opts?: {
    startsAtOverride?: string;
    occurrenceNumber?: number;
    isProjectedOccurrence?: boolean;
  },
): EnterprisePlannerEvent | null {
  const resolved = opts?.startsAtOverride
    ? { startsAt: opts.startsAtOverride, needsSchedule: false }
    : resolvePlannerStartsAt(task);
  const startsAt = resolved.startsAt;
  if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) return null;

  const statusRaw = resolveTaskStatus(task);
  const col = columnForTask({ ...task, dueOn: startsAt });
  const { tone, status } = resolveScheduleTone({
    status: statusRaw,
    column: col,
    startsAt,
  });
  const activityType = resolvePlannerActivityType(task);
  const meta = PLANNER_ACTIVITY_META[activityType];
  const completedOrCancelled =
    statusRaw === "completed" || statusRaw === "cancelled" || task.enabled === false;
  const recurring = isRecurringTask(task);
  const projected = Boolean(opts?.isProjectedOccurrence);
  const occurrenceNumber = opts?.occurrenceNumber ?? task.occurrenceNumber;

  return {
    id: projected
      ? `ete:${task.id}:occ:${occurrenceNumber ?? "x"}:${dateKey(startsAt)}`
      : `ete:${task.id}`,
    source: "ete_task",
    title: taskTitle(task),
    customerName: task.borrowerName ?? task.entityLabel,
    activityType,
    activityLabel: meta.label,
    activityIcon: meta.icon,
    opportunityRef: task.opportunityRef,
    opportunityId: resolveOpportunityId(task),
    contactId: task.contactId,
    startsAt,
    allDay: resolved.needsSchedule,
    timeLabel: resolved.needsSchedule ? "Unscheduled" : formatTime(startsAt),
    dueDateLabel: formatDueDate(startsAt),
    priority: task.priority,
    assigneeRef: task.assigneeRef,
    assigneeLabel: assigneeLabel(task.assigneeRef ?? ""),
    scheduleTone: resolved.needsSchedule ? "scheduled" : tone,
    status: resolved.needsSchedule ? "scheduled" : status,
    notes: task.description ?? task.completionNotes,
    taskId: task.id,
    entityKind: task.entityKind,
    entityId: task.entityId,
    entityLabel: task.entityLabel ?? task.borrowerName,
    canReschedule: !completedOrCancelled && !projected,
    rescheduleBlockReason: projected
      ? "Projected recurrence — open the series task to reschedule."
      : completedOrCancelled
        ? statusRaw === "cancelled"
          ? "Cancelled activities cannot be rescheduled."
          : "Completed activities cannot be rescheduled."
        : undefined,
    externalCalendarHint: "none",
    kind: activityType,
    subtitle: [task.loanProduct, task.lenderName].filter(Boolean).join(" · ") || undefined,
    scheduleKind: recurring ? "recurring" : "one_time",
    seriesId: task.seriesId,
    occurrenceNumber,
    recurrenceLabel:
      recurring && task.recurrence ? describeEteRecurrence(task.recurrence) : undefined,
    isProjectedOccurrence: projected || undefined,
    needsSchedule: resolved.needsSchedule || undefined,
  };
}

/**
 * Project one ETE task into Planner events for the visible range.
 * Recurring series: emit virtual future occurrences (not separate registry rows).
 */
function projectTaskToPlannerEvents(
  task: EteTask,
  rangeStart: Date,
  rangeEnd: Date,
  seriesDueKeys: Set<string>,
): EnterprisePlannerEvent[] {
  const statusRaw = resolveTaskStatus(task);
  if (task.enabled === false && statusRaw === "cancelled") return [];

  const base = taskToPlannerEvent(task);
  if (!base) return [];

  const events: EnterprisePlannerEvent[] = [];
  const baseTime = new Date(base.startsAt);
  // Always keep the registry occurrence itself (Agenda / overdue visibility).
  events.push(base);

  if (
    !isRecurringTask(task) ||
    !task.recurrence ||
    !task.dueOn ||
    statusRaw === "cancelled" ||
    task.seriesStatus === "cancelled"
  ) {
    return events;
  }

  let cursor = task.dueOn;
  let occurrence = task.occurrenceNumber ?? 1;
  const maxSteps = 400;

  for (let i = 0; i < maxSteps; i += 1) {
    const nextIso = computeNextOccurrenceDueOn(task.recurrence, cursor);
    if (!nextIso) break;
    const nextDate = new Date(nextIso);
    if (Number.isNaN(nextDate.getTime())) break;
    if (nextDate >= rangeEnd) break;

    cursor = nextIso;
    occurrence += 1;

    const key = `${task.seriesId ?? task.id}:${dateKey(nextIso)}`;
    if (seriesDueKeys.has(key)) continue;
    if (nextDate < rangeStart) continue;

    // Avoid duplicating the base due day
    if (dateKey(nextIso) === dateKey(base.startsAt)) continue;

    const projected = taskToPlannerEvent(task, {
      startsAtOverride: nextIso,
      occurrenceNumber: occurrence,
      isProjectedOccurrence: true,
    });
    if (projected) {
      // Projected future occurrences are scheduled (not overdue of the open task)
      projected.scheduleTone = "scheduled";
      projected.status = "scheduled";
      events.push(projected);
    }

    if (task.recurrence.end?.mode === "after_count") {
      const maxCount = task.recurrence.end.count;
      if (typeof maxCount === "number" && occurrence >= maxCount) break;
    }

    void baseTime;
  }

  return events;
}

function buildSeriesDueIndex(tasks: EteTask[]): Set<string> {
  const keys = new Set<string>();
  for (const t of tasks) {
    if (!t.dueOn) continue;
    const series = t.seriesId?.trim() || t.id;
    keys.add(`${series}:${dateKey(t.dueOn)}`);
  }
  return keys;
}

/** Projection window for recurrence expansion (beyond current view for Agenda). */
function expansionRange(viewMode: PlannerViewMode, focus: Date): {
  start: Date;
  end: Date;
} {
  const view = rangeForView(viewMode, focus);
  const today = startOfDay(new Date());
  const start = startOfDay(
    new Date(Math.min(view.start.getTime(), addDays(today, -30).getTime())),
  );
  const end = startOfDay(
    new Date(Math.max(view.end.getTime(), addDays(today, 120).getTime())),
  );
  return { start, end };
}

/** Single SSOT — Enterprise Task Registry only (no parallel Meeting/Reminder task stores). */
function collectEvents(viewMode: PlannerViewMode, focus: Date): EnterprisePlannerEvent[] {
  const tasks = listEteTasks();
  const seriesDueKeys = buildSeriesDueIndex(tasks);
  const { start, end } = expansionRange(viewMode, focus);
  const out: EnterprisePlannerEvent[] = [];
  for (const task of tasks) {
    out.push(...projectTaskToPlannerEvents(task, start, end, seriesDueKeys));
  }
  return out.sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

function rangeForView(viewMode: PlannerViewMode, focus: Date): { start: Date; end: Date } {
  const day = startOfDay(focus);
  switch (viewMode) {
    case "day":
      return { start: day, end: addDays(day, 1) };
    case "week": {
      const dow = day.getDay();
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const start = addDays(day, mondayOffset);
      return { start, end: addDays(start, 7) };
    }
    case "month": {
      const start = new Date(day.getFullYear(), day.getMonth(), 1);
      const end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
      return { start, end };
    }
    case "agenda":
    default:
      return { start: addDays(day, -30), end: addDays(day, 60) };
  }
}

function buildAgendaSections(all: EnterprisePlannerEvent[]): EnterprisePlannerAgendaSection[] {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);

  const buckets: Record<PlannerAgendaSectionId, EnterprisePlannerEvent[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    upcoming: [],
  };

  for (const e of all) {
    if (e.status === "completed" || e.status === "cancelled") continue;
    const due = startOfDay(new Date(e.startsAt));
    if (e.scheduleTone === "overdue" || due.getTime() < today.getTime()) {
      buckets.overdue.push(e);
      continue;
    }
    if (due.getTime() === today.getTime()) {
      buckets.today.push(e);
      continue;
    }
    if (due.getTime() === tomorrow.getTime()) {
      buckets.tomorrow.push(e);
      continue;
    }
    if (due.getTime() > tomorrow.getTime() && due.getTime() < weekEnd.getTime()) {
      buckets.this_week.push(e);
      continue;
    }
    if (due.getTime() >= weekEnd.getTime()) {
      buckets.upcoming.push(e);
    }
  }

  return PLANNER_AGENDA_SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    events: buckets[s.id],
  })).filter((s) => s.events.length > 0);
}

function buildLegacyAgendaDays(
  events: EnterprisePlannerEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): EnterprisePlannerAgendaDay[] {
  const todayKey = dateKey(new Date());
  const map = new Map<string, EnterprisePlannerEvent[]>();
  for (const e of events) {
    const t = new Date(e.startsAt);
    if (t < rangeStart || t >= rangeEnd) continue;
    const key = dateKey(e.startsAt);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, dayEvents]) => ({
      dateKey: key,
      label: key === todayKey ? "Today" : key,
      isToday: key === todayKey,
      events: dayEvents,
    }));
}

export function buildPlannerSnapshot(input?: {
  viewMode?: PlannerViewMode;
  focusDate?: string;
}): EnterprisePlannerSnapshot {
  const viewMode = input?.viewMode ?? PLANNER_DEFAULT_VIEW;
  const focus = input?.focusDate ? new Date(input.focusDate) : new Date();
  const { start, end } = rangeForView(viewMode, focus);
  const all = collectEvents(viewMode, focus);
  const inRange =
    viewMode === "agenda"
      ? all.filter((e) => {
          const t = new Date(e.startsAt);
          return t >= start && t < end;
        })
      : all.filter((e) => {
          const t = new Date(e.startsAt);
          return t >= start && t < end;
        });

  const todayStart = startOfDay(new Date());
  const todayEnd = addDays(todayStart, 1);
  const todayEvents = all.filter((e) => {
    const t = new Date(e.startsAt);
    return t >= todayStart && t < todayEnd;
  });

  const meetingTypes = new Set([
    "customer_meeting",
    "customer_call",
    "site_visit",
    "bank_follow_up",
  ]);

  return {
    asOf: new Date().toISOString(),
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    viewMode,
    focusDate: startOfDay(focus).toISOString(),
    events: inRange,
    agendaSections: buildAgendaSections(all),
    agenda: buildLegacyAgendaDays(all, start, end),
    counts: {
      todayMeetings: todayEvents.filter((e) => meetingTypes.has(e.activityType)).length,
      todayTasks: todayEvents.filter((e) => e.source === "ete_task").length,
      upcoming: all.filter((e) => {
        const t = new Date(e.startsAt);
        return e.scheduleTone === "scheduled" && t >= todayEnd;
      }).length,
      overdue: all.filter((e) => e.scheduleTone === "overdue").length,
    },
    syncReadiness: {
      googleCalendar: "reserved",
      microsoftOutlook: "reserved",
    },
  };
}

export function eventsForDate(
  snapshot: EnterprisePlannerSnapshot,
  day: Date,
): EnterprisePlannerEvent[] {
  const key = dateKey(day);
  return snapshot.events.filter((e) => dateKey(e.startsAt) === key);
}
