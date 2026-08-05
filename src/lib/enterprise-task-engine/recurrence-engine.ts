/**
 * Enterprise Recurrence Engine (CO-ETE-RECURRING-001).
 * SSOT for next-occurrence math — Planner/UI must not reimplement.
 */

import {
  ETE_JS_DAY_TO_WEEKDAY,
  ETE_WEEKDAY_TO_JS_DAY,
} from "@/constants/enterprise-task-engine/recurrence";
import type {
  EteRecurrenceEnd,
  EteReminderOffset,
  EteTask,
  EteTaskRecurrence,
  EteWeekdayCode,
  EteWeekdayOrdinal,
} from "@/types/enterprise-task-engine";

function cloneDate(d: Date): Date {
  return new Date(d.getTime());
}

function startOfLocalDay(d: Date): Date {
  const x = cloneDate(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, monthIndex));
}

function addMonthsKeepingTime(from: Date, months: number, dayOfMonth?: number): Date {
  const next = cloneDate(from);
  const targetMonth = next.getMonth() + months;
  const year = next.getFullYear() + Math.floor(targetMonth / 12);
  const monthIndex = ((targetMonth % 12) + 12) % 12;
  const dom = clampDayOfMonth(year, monthIndex, dayOfMonth ?? next.getDate());
  next.setFullYear(year, monthIndex, dom);
  return next;
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: EteWeekdayCode,
  ordinal: EteWeekdayOrdinal,
  hours: number,
  minutes: number,
  seconds: number,
  ms: number,
): Date {
  const targetDow = ETE_WEEKDAY_TO_JS_DAY[weekday];
  if (ordinal === "last") {
    const lastDay = daysInMonth(year, monthIndex);
    for (let day = lastDay; day >= 1; day -= 1) {
      const d = new Date(year, monthIndex, day, hours, minutes, seconds, ms);
      if (d.getDay() === targetDow) return d;
    }
  }
  const ordinalIndex =
    ordinal === "first" ? 1 : ordinal === "second" ? 2 : ordinal === "third" ? 3 : 4;
  let seen = 0;
  const lastDay = daysInMonth(year, monthIndex);
  for (let day = 1; day <= lastDay; day += 1) {
    const d = new Date(year, monthIndex, day, hours, minutes, seconds, ms);
    if (d.getDay() === targetDow) {
      seen += 1;
      if (seen === ordinalIndex) return d;
    }
  }
  // Fallback: last matching weekday in month
  for (let day = lastDay; day >= 1; day -= 1) {
    const d = new Date(year, monthIndex, day, hours, minutes, seconds, ms);
    if (d.getDay() === targetDow) return d;
  }
  return new Date(year, monthIndex, 1, hours, minutes, seconds, ms);
}

function weekdayFromDate(d: Date): EteWeekdayCode {
  return ETE_JS_DAY_TO_WEEKDAY[d.getDay()] ?? "mon";
}

function normalizeRecurrence(rule: EteTaskRecurrence): EteTaskRecurrence {
  return {
    ...rule,
    interval: Math.max(1, Math.floor(rule.interval || 1)),
    end: rule.end ?? { mode: "forever" },
  };
}

/** Normalize legacy / partial recurrence payloads. */
export function coerceEteRecurrence(
  raw:
    | {
        frequency?: string;
        interval?: number;
        weekdays?: EteWeekdayCode[];
        monthlyMode?: EteTaskRecurrence["monthlyMode"];
        weekdayOrdinal?: EteWeekdayOrdinal;
        weekday?: EteWeekdayCode;
        dayOfMonth?: number;
        end?: EteRecurrenceEnd;
        reminderOffset?: EteReminderOffset;
      }
    | undefined
    | null,
): EteTaskRecurrence | null {
  if (!raw?.frequency || raw.frequency === "none") return null;
  const allowed = new Set([
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "half_yearly",
    "yearly",
  ]);
  if (!allowed.has(raw.frequency)) return null;
  const frequency = raw.frequency as EteTaskRecurrence["frequency"];
  const end: EteRecurrenceEnd =
    raw.end?.mode === "after_count"
      ? { mode: "after_count", count: Math.max(1, raw.end.count || 1) }
      : raw.end?.mode === "on_date" && raw.end.endOn
        ? { mode: "on_date", endOn: raw.end.endOn }
        : { mode: "forever" };
  return normalizeRecurrence({
    frequency,
    interval: raw.interval ?? 1,
    weekdays: raw.weekdays,
    monthlyMode: raw.monthlyMode,
    weekdayOrdinal: raw.weekdayOrdinal,
    weekday: raw.weekday,
    dayOfMonth: raw.dayOfMonth,
    end,
    reminderOffset: raw.reminderOffset,
  });
}

export function validateEteRecurrenceRule(
  rule: EteTaskRecurrence | undefined,
  dueOn?: string,
): string | null {
  if (!rule) return "Recurring tasks require a recurrence rule.";
  if (!dueOn) return "Recurring tasks require a due date (first occurrence).";
  if (!Number.isFinite(new Date(dueOn).getTime())) return "Invalid due date.";
  const interval = rule.interval ?? 1;
  if (interval < 1) return "Repeat interval must be at least 1.";
  if (rule.frequency === "weekly") {
    if (!rule.weekdays?.length) return "Select at least one weekday for weekly recurrence.";
  }
  if (rule.frequency === "monthly" && rule.monthlyMode === "same_weekday") {
    if (!rule.weekday) return "Select a weekday for monthly same-weekday recurrence.";
    if (!rule.weekdayOrdinal) return "Select First / Second / Third / Fourth / Last.";
  }
  if (rule.end.mode === "after_count" && (!rule.end.count || rule.end.count < 1)) {
    return "End after count must be at least 1.";
  }
  if (rule.end.mode === "on_date") {
    if (!rule.end.endOn || Number.isNaN(new Date(rule.end.endOn).getTime())) {
      return "End on date is required.";
    }
  }
  return null;
}

export function describeEteRecurrence(rule: EteTaskRecurrence): string {
  const n = normalizeRecurrence(rule);
  const unit =
    n.frequency === "daily"
      ? n.interval === 1
        ? "day"
        : `${n.interval} days`
      : n.frequency === "weekly"
        ? n.interval === 1
          ? "week"
          : `${n.interval} weeks`
        : n.frequency === "monthly"
          ? "month"
          : n.frequency === "quarterly"
            ? "quarter"
            : n.frequency === "half_yearly"
              ? "6 months"
              : "year";

  let body = `Every ${unit}`;
  if (n.frequency === "weekly" && n.weekdays?.length) {
    body = `Every ${n.interval === 1 ? "" : `${n.interval} weeks · `}${n.weekdays
      .map((d) => d[0]!.toUpperCase() + d.slice(1))
      .join(", ")}`;
  }
  if (n.frequency === "monthly") {
    if (n.monthlyMode === "same_weekday" && n.weekdayOrdinal && n.weekday) {
      body = `${n.weekdayOrdinal[0]!.toUpperCase()}${n.weekdayOrdinal.slice(1)} ${n.weekday}`;
    } else {
      body = `Day ${n.dayOfMonth ?? "same"} each month`;
    }
  }
  if (n.end.mode === "after_count") body += ` · ends after ${n.end.count}`;
  if (n.end.mode === "on_date") body += ` · ends ${n.end.endOn.slice(0, 10)}`;
  return body;
}

export function resolveReminderAt(
  dueOnIso: string,
  offset: EteReminderOffset | undefined,
): string | undefined {
  if (!offset || offset === "none") return undefined;
  const due = new Date(dueOnIso);
  if (Number.isNaN(due.getTime())) return undefined;
  if (offset === "at_due") return due.toISOString();
  const ms =
    offset === "15_minutes"
      ? 15 * 60 * 1000
      : offset === "1_hour"
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  return new Date(due.getTime() - ms).toISOString();
}

function nextWeekly(from: Date, weekdays: EteWeekdayCode[], intervalWeeks: number): Date {
  const selected = new Set(weekdays.map((w) => ETE_WEEKDAY_TO_JS_DAY[w]));
  // Search forward day-by-day; when wrapping past Sunday into a new week cycle,
  // skip (intervalWeeks - 1) full weeks after leaving the anchor week.
  const anchorWeekStart = startOfLocalDay(from);
  const anchorDow = from.getDay();
  const mondayOffset = anchorDow === 0 ? -6 : 1 - anchorDow;
  anchorWeekStart.setDate(anchorWeekStart.getDate() + mondayOffset);

  for (let i = 1; i <= 14 * Math.max(1, intervalWeeks) + 7; i += 1) {
    const candidate = cloneDate(from);
    candidate.setDate(candidate.getDate() + i);
    if (!selected.has(candidate.getDay())) continue;

    if (intervalWeeks <= 1) return candidate;

    const candWeekStart = startOfLocalDay(candidate);
    const candDow = candidate.getDay();
    const candMonOff = candDow === 0 ? -6 : 1 - candDow;
    candWeekStart.setDate(candWeekStart.getDate() + candMonOff);
    const weekDiff = Math.round(
      (candWeekStart.getTime() - anchorWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    if (weekDiff % intervalWeeks === 0) return candidate;
  }
  const fallback = cloneDate(from);
  fallback.setDate(fallback.getDate() + 7 * intervalWeeks);
  return fallback;
}

function nextMonthlySameWeekday(from: Date, rule: EteTaskRecurrence): Date {
  const weekday = rule.weekday ?? weekdayFromDate(from);
  const ordinal = rule.weekdayOrdinal ?? "first";
  const hours = from.getHours();
  const minutes = from.getMinutes();
  const seconds = from.getSeconds();
  const ms = from.getMilliseconds();

  for (let add = 1; add <= 24; add += 1) {
    const probe = addMonthsKeepingTime(from, add);
    const candidate = nthWeekdayOfMonth(
      probe.getFullYear(),
      probe.getMonth(),
      weekday,
      ordinal,
      hours,
      minutes,
      seconds,
      ms,
    );
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  return addMonthsKeepingTime(from, 1);
}

/**
 * Compute the next occurrence due timestamp after `fromDueOn` (exclusive).
 */
export function computeNextOccurrenceDueOn(
  rule: EteTaskRecurrence,
  fromDueOn: string,
): string | null {
  const n = normalizeRecurrence(rule);
  const from = new Date(fromDueOn);
  if (Number.isNaN(from.getTime())) return null;

  let next: Date;
  switch (n.frequency) {
    case "daily": {
      next = cloneDate(from);
      next.setDate(next.getDate() + n.interval);
      break;
    }
    case "weekly": {
      const days = n.weekdays?.length ? n.weekdays : [weekdayFromDate(from)];
      next = nextWeekly(from, days, n.interval);
      break;
    }
    case "monthly": {
      if (n.monthlyMode === "same_weekday") {
        next = nextMonthlySameWeekday(from, n);
      } else {
        const dom = n.dayOfMonth ?? from.getDate();
        next = addMonthsKeepingTime(from, n.interval, dom);
      }
      break;
    }
    case "quarterly": {
      const dom = n.dayOfMonth ?? from.getDate();
      next = addMonthsKeepingTime(from, 3 * n.interval, dom);
      break;
    }
    case "half_yearly": {
      const dom = n.dayOfMonth ?? from.getDate();
      next = addMonthsKeepingTime(from, 6 * n.interval, dom);
      break;
    }
    case "yearly": {
      next = cloneDate(from);
      next.setFullYear(next.getFullYear() + n.interval);
      break;
    }
    default:
      return null;
  }

  if (n.end.mode === "on_date") {
    const end = startOfLocalDay(new Date(n.end.endOn));
    if (startOfLocalDay(next).getTime() > end.getTime()) return null;
  }

  return next.toISOString();
}

export function shouldSpawnNextOccurrence(task: Pick<
  EteTask,
  "scheduleKind" | "recurrence" | "occurrenceNumber" | "seriesStatus" | "dueOn"
>): boolean {
  if (task.scheduleKind !== "recurring") return false;
  if (task.seriesStatus === "ended" || task.seriesStatus === "cancelled") return false;
  const rule = coerceEteRecurrence(task.recurrence);
  if (!rule || !task.dueOn) return false;
  const occurrenceNumber = task.occurrenceNumber ?? 1;
  if (rule.end.mode === "after_count" && occurrenceNumber >= rule.end.count) return false;
  return computeNextOccurrenceDueOn(rule, task.dueOn) != null;
}

export function isRecurringTask(task: Pick<EteTask, "scheduleKind" | "seriesId" | "recurrence">): boolean {
  return (
    task.scheduleKind === "recurring" ||
    Boolean(task.seriesId) ||
    Boolean(coerceEteRecurrence(task.recurrence))
  );
}

export function occurrenceDueKey(dueOn: string): string {
  return dateKeyLocal(new Date(dueOn));
}

/** Fields copied onto the next occurrence (history stays on prior rows). */
export function buildNextOccurrenceDraft(
  completed: EteTask,
  nextDueOn: string,
  actorId: string,
): Omit<
  EteTask,
  "id" | "enabled" | "createdOn" | "modifiedBy" | "modifiedOn" | "coOwnerRefs" | "escalated" | "colourStatus"
> & { coOwnerRefs?: string[] } {
  const rule = coerceEteRecurrence(completed.recurrence)!;
  const nextOccurrence = (completed.occurrenceNumber ?? 1) + 1;
  return {
    taskType: completed.taskType,
    assigneeRef: completed.assigneeRef,
    opportunityRef: completed.opportunityRef,
    dueOn: nextDueOn,
    scheduleKind: "recurring",
    recurrence: rule,
    seriesId: completed.seriesId,
    seriesRootTaskId: completed.seriesRootTaskId ?? completed.id,
    occurrenceNumber: nextOccurrence,
    seriesStatus: "active",
    predefinedDescription: completed.predefinedDescription,
    description: completed.description,
    coOwnerRefs: [...(completed.coOwnerRefs ?? [])],
    reportingManagerRef: completed.reportingManagerRef,
    category: completed.category,
    priority: completed.priority,
    borrowerName: completed.borrowerName,
    loanProduct: completed.loanProduct,
    lenderName: completed.lenderName,
    department: completed.department,
    assignedByRef: completed.assignedByRef,
    grossStage: completed.grossStage,
    fileId: completed.fileId,
    contactId: completed.contactId,
    dealId: completed.dealId,
    reminderAt: resolveReminderAt(nextDueOn, rule.reminderOffset),
    chanakyaMonitoring: true,
    title: completed.title,
    workType: completed.workType,
    status: "open",
    entityKind: completed.entityKind,
    entityId: completed.entityId,
    entityLabel: completed.entityLabel,
    documentId: completed.documentId,
    lenderId: completed.lenderId,
    systemGenerated: true,
    createdBy: actorId,
    // Fresh checklist / notes / attachments per occurrence — do not copy history.
    checklist: completed.checklist?.map((c) => ({ ...c, done: false })),
  };
}
