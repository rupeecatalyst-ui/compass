/**
 * Invoice financial year — OrganizationSettings.financialYearStartMonth + org timezone.
 * Do not use UTC calendar year, Deal number year, or dashboard April helper.
 */

export function zonedCalendarDate(
  at: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(at);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("Unable to resolve calendar date in organization timezone");
  }
  return { year, month, day };
}

export function financialYearKeyFromCalendar(
  year: number,
  month: number,
  startMonth: number,
): string {
  const start = Number.isInteger(startMonth) && startMonth >= 1 && startMonth <= 12 ? startMonth : 4;
  const startYear = month >= start ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

export function resolveInvoiceFinancialYearKey(input: {
  at: Date;
  timeZone: string;
  financialYearStartMonth: number;
}): string {
  const cal = zonedCalendarDate(input.at, input.timeZone);
  return financialYearKeyFromCalendar(cal.year, cal.month, input.financialYearStartMonth);
}

export function calendarDateToUtcNoon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function parseIsoDateOnly(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw Object.assign(new Error("invoiceDate must be YYYY-MM-DD"), {
      statusCode: 400,
      code: "INVALID_INVOICE_DATE",
    });
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    throw Object.assign(new Error("invoiceDate is not a valid calendar date"), {
      statusCode: 400,
      code: "INVALID_INVOICE_DATE",
    });
  }
  return { year, month, day };
}

export function todayIsoDateInTimeZone(timeZone: string, at = new Date()): string {
  const cal = zonedCalendarDate(at, timeZone);
  return `${cal.year}-${String(cal.month).padStart(2, "0")}-${String(cal.day).padStart(2, "0")}`;
}
