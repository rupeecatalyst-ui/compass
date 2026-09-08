export type WorkingHoursWindow = {
  openMinutes: number;
  closeMinutes: number;
};

export type OrganizationWorkingCalendar = {
  timeZone: string;
  /** 0 = Sunday … 6 = Saturday. Empty = Mon–Fri. */
  workingDays: number[];
  workingHours: WorkingHoursWindow;
  /** ISO dates YYYY-MM-DD in the organisation timezone. */
  holidays: string[];
  versionNumber: number;
  calendarId?: string | null;
};

export type WorkingHourSlaResult = {
  requestedAtIso: string;
  deadlineIso: string;
  expectedContactAtIso: string;
  remainingWorkingMs: number;
  state:
    | "working_sla_active"
    | "paused_outside_working_hours"
    | "attention_required"
    | "urgent"
    | "sla_breached"
    | "contacted_within_sla"
    | "contacted_after_sla";
  calendarVersionNumber: number;
  calendarId: string | null;
  queuedUntilOpen: boolean;
};

const DEFAULT_HOURS: WorkingHoursWindow = { openMinutes: 10 * 60, closeMinutes: 19 * 60 };
const DEFAULT_DAYS = [1, 2, 3, 4, 5];

function zonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: weekdayMap[get("weekday")] ?? 1,
  };
}

function ymd(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function isWorkingDay(calendar: OrganizationWorkingCalendar, date: Date): boolean {
  const parts = zonedParts(date, calendar.timeZone);
  const days = calendar.workingDays.length > 0 ? calendar.workingDays : DEFAULT_DAYS;
  if (!days.includes(parts.weekday)) return false;
  return !calendar.holidays.includes(ymd(parts));
}

function minutesOfDay(parts: { hour: number; minute: number; second: number }): number {
  return parts.hour * 60 + parts.minute + parts.second / 60;
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function normalizeWorkingCalendar(
  raw: Partial<OrganizationWorkingCalendar> | null | undefined,
): OrganizationWorkingCalendar {
  const hours = raw?.workingHours ?? DEFAULT_HOURS;
  return {
    timeZone: raw?.timeZone?.trim() || "Asia/Kolkata",
    workingDays: Array.isArray(raw?.workingDays) && raw.workingDays.length > 0 ? raw.workingDays : DEFAULT_DAYS,
    workingHours: {
      openMinutes: hours.openMinutes ?? DEFAULT_HOURS.openMinutes,
      closeMinutes: hours.closeMinutes ?? DEFAULT_HOURS.closeMinutes,
    },
    holidays: Array.isArray(raw?.holidays) ? raw.holidays : [],
    versionNumber: raw?.versionNumber ?? 1,
    calendarId: raw?.calendarId ?? null,
  };
}

/**
 * Advance `workingMinutes` along the organisation calendar from `from`.
 */
export function addWorkingMinutes(from: Date, workingMinutes: number, calendar: OrganizationWorkingCalendar): Date {
  const cal = normalizeWorkingCalendar(calendar);
  let cursor = new Date(from.getTime());
  let remaining = workingMinutes;
  let guard = 0;

  while (remaining > 0 && guard < 366 * 24) {
    guard += 1;
    const parts = zonedParts(cursor, cal.timeZone);
    if (!isWorkingDay(cal, cursor)) {
      cursor = addCalendarDays(cursor, 1);
      const nextParts = zonedParts(cursor, cal.timeZone);
      const openMsOffset = (cal.workingHours.openMinutes - minutesOfDay(nextParts)) * 60 * 1000;
      cursor = new Date(cursor.getTime() + openMsOffset);
      continue;
    }
    const nowMinutes = minutesOfDay(parts);
    if (nowMinutes < cal.workingHours.openMinutes) {
      cursor = new Date(cursor.getTime() + (cal.workingHours.openMinutes - nowMinutes) * 60 * 1000);
      continue;
    }
    if (nowMinutes >= cal.workingHours.closeMinutes) {
      cursor = addCalendarDays(cursor, 1);
      const nextParts = zonedParts(cursor, cal.timeZone);
      cursor = new Date(
        cursor.getTime() + (cal.workingHours.openMinutes - minutesOfDay(nextParts)) * 60 * 1000,
      );
      continue;
    }
    const remainingToday = cal.workingHours.closeMinutes - nowMinutes;
    if (remaining <= remainingToday) {
      return new Date(cursor.getTime() + remaining * 60 * 1000);
    }
    remaining -= remainingToday;
    cursor = addCalendarDays(cursor, 1);
    const nextParts = zonedParts(cursor, cal.timeZone);
    cursor = new Date(
      cursor.getTime() + (cal.workingHours.openMinutes - minutesOfDay(nextParts)) * 60 * 1000,
    );
  }
  return cursor;
}

export function remainingWorkingMs(
  from: Date,
  deadline: Date,
  now: Date,
  calendar: OrganizationWorkingCalendar,
): number {
  if (now.getTime() >= deadline.getTime()) return 0;
  const cal = normalizeWorkingCalendar(calendar);
  let cursor = new Date(Math.max(from.getTime(), now.getTime()));
  let acc = 0;
  let guard = 0;
  while (cursor.getTime() < deadline.getTime() && guard < 366 * 24) {
    guard += 1;
    const parts = zonedParts(cursor, cal.timeZone);
    if (!isWorkingDay(cal, cursor) || minutesOfDay(parts) >= cal.workingHours.closeMinutes) {
      cursor = addCalendarDays(cursor, 1);
      const nextParts = zonedParts(cursor, cal.timeZone);
      cursor = new Date(
        cursor.getTime() + (cal.workingHours.openMinutes - minutesOfDay(nextParts)) * 60 * 1000,
      );
      continue;
    }
    if (minutesOfDay(parts) < cal.workingHours.openMinutes) {
      cursor = new Date(
        cursor.getTime() + (cal.workingHours.openMinutes - minutesOfDay(parts)) * 60 * 1000,
      );
      continue;
    }
    const endOfSlice = Math.min(
      deadline.getTime(),
      cursor.getTime() + (cal.workingHours.closeMinutes - minutesOfDay(parts)) * 60 * 1000,
    );
    acc += Math.max(0, endOfSlice - cursor.getTime());
    cursor = new Date(endOfSlice);
  }
  return acc;
}

export function classifySlaUrgency(remainingWorkingMsValue: number, breached: boolean): WorkingHourSlaResult["state"] {
  if (breached) return "sla_breached";
  const minutes = remainingWorkingMsValue / 60000;
  if (minutes < 15) return "urgent";
  if (minutes <= 30) return "attention_required";
  return "working_sla_active";
}

export function calculateOneWorkingHourSla(input: {
  requestedAt: Date;
  now?: Date;
  calendar: OrganizationWorkingCalendar;
  contactedAt?: Date | null;
}): WorkingHourSlaResult {
  const cal = normalizeWorkingCalendar(input.calendar);
  const requestedAt = input.requestedAt;
  const now = input.now ?? new Date();
  const deadline = addWorkingMinutes(requestedAt, 60, cal);
  const queued =
    !isWorkingDay(cal, requestedAt) ||
    minutesOfDay(zonedParts(requestedAt, cal.timeZone)) < cal.workingHours.openMinutes ||
    minutesOfDay(zonedParts(requestedAt, cal.timeZone)) >= cal.workingHours.closeMinutes;

  if (input.contactedAt) {
    const within = input.contactedAt.getTime() <= deadline.getTime();
    return {
      requestedAtIso: requestedAt.toISOString(),
      deadlineIso: deadline.toISOString(),
      expectedContactAtIso: deadline.toISOString(),
      remainingWorkingMs: 0,
      state: within ? "contacted_within_sla" : "contacted_after_sla",
      calendarVersionNumber: cal.versionNumber,
      calendarId: cal.calendarId ?? null,
      queuedUntilOpen: queued,
    };
  }

  const remaining = remainingWorkingMs(requestedAt, deadline, now, cal);
  const breached = now.getTime() > deadline.getTime() && remaining === 0;
  let state = classifySlaUrgency(remaining, breached);
  if (!breached && queued && remaining > 30 * 60000) {
    state = "paused_outside_working_hours";
  }

  return {
    requestedAtIso: requestedAt.toISOString(),
    deadlineIso: deadline.toISOString(),
    expectedContactAtIso: deadline.toISOString(),
    remainingWorkingMs: remaining,
    state,
    calendarVersionNumber: cal.versionNumber,
    calendarId: cal.calendarId ?? null,
    queuedUntilOpen: queued,
  };
}

export function borrowerSlaCopy(state: WorkingHourSlaResult["state"], queuedUntilOpen: boolean): string {
  if (state === "contacted_within_sla" || state === "contacted_after_sla") {
    return "Our Home Loan Specialist has connected with you.";
  }
  if (state === "sla_breached") {
    return "Your request has been prioritised. Our Home Loan Specialist will contact you shortly.";
  }
  if (queuedUntilOpen || state === "paused_outside_working_hours") {
    return "Your request has been received. Our Home Loan Specialist will contact you within one working hour after our office reopens.";
  }
  return "Our Home Loan Specialist will contact you within one working hour.";
}
