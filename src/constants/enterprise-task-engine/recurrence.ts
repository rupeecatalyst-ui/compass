/**
 * ETE Recurrence — constants (CO-ETE-RECURRING-001).
 * Business rules live in `src/lib/enterprise-task-engine/recurrence-engine.ts`.
 */

import type {
  EteRecurrenceFrequency,
  EteReminderOffset,
  EteScheduleKind,
  EteWeekdayCode,
  EteWeekdayOrdinal,
} from "@/types/enterprise-task-engine";

export const ETE_SCHEDULE_KINDS: { id: EteScheduleKind; label: string }[] = [
  { id: "one_time", label: "One-Time" },
  { id: "recurring", label: "Recurring" },
];

export const ETE_RECURRENCE_FREQUENCIES: {
  id: EteRecurrenceFrequency;
  label: string;
}[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "half_yearly", label: "Half-Yearly" },
  { id: "yearly", label: "Yearly" },
];

export const ETE_WEEKDAYS: { id: EteWeekdayCode; label: string; short: string }[] = [
  { id: "mon", label: "Monday", short: "Mon" },
  { id: "tue", label: "Tuesday", short: "Tue" },
  { id: "wed", label: "Wednesday", short: "Wed" },
  { id: "thu", label: "Thursday", short: "Thu" },
  { id: "fri", label: "Friday", short: "Fri" },
  { id: "sat", label: "Saturday", short: "Sat" },
  { id: "sun", label: "Sunday", short: "Sun" },
];

/** JS `Date#getDay()` → weekday code (0 = Sunday). */
export const ETE_JS_DAY_TO_WEEKDAY: EteWeekdayCode[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export const ETE_WEEKDAY_TO_JS_DAY: Record<EteWeekdayCode, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export const ETE_WEEKDAY_ORDINALS: { id: EteWeekdayOrdinal; label: string }[] = [
  { id: "first", label: "First" },
  { id: "second", label: "Second" },
  { id: "third", label: "Third" },
  { id: "fourth", label: "Fourth" },
  { id: "last", label: "Last" },
];

export const ETE_REMINDER_OFFSETS: { id: EteReminderOffset; label: string }[] = [
  { id: "none", label: "No reminder" },
  { id: "at_due", label: "At due time" },
  { id: "15_minutes", label: "15 minutes before" },
  { id: "1_hour", label: "1 hour before" },
  { id: "1_day", label: "1 day before" },
];

export const ETE_DAILY_INTERVAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 14, 30] as const;
export const ETE_WEEKLY_INTERVAL_OPTIONS = [1, 2, 3, 4] as const;

/** Planner / Tasks desk schedule filters. */
export const ETE_SCHEDULE_FILTERS = [
  { id: "all", label: "All" },
  { id: "one_time", label: "One-Time" },
  { id: "recurring", label: "Recurring" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
] as const;

export type EteScheduleFilterId = (typeof ETE_SCHEDULE_FILTERS)[number]["id"];
