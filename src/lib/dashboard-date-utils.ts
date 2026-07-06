import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type DashboardDatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "quarter"
  | "financial_year"
  | "custom";

export interface DashboardDateRange {
  preset: DashboardDatePreset;
  start: Date;
  end: Date;
  label: string;
  scaleFactor: number;
}

const PRESET_LABELS: Record<Exclude<DashboardDatePreset, "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  last_week: "Last Week",
  this_month: "This Month",
  last_month: "Last Month",
  quarter: "This Quarter",
  financial_year: "Financial Year",
};

function getFinancialYearStart(reference: Date): Date {
  const year = reference.getMonth() >= 3 ? reference.getFullYear() : reference.getFullYear() - 1;
  return new Date(year, 3, 1);
}

function getFinancialYearEnd(reference: Date): Date {
  const start = getFinancialYearStart(reference);
  return endOfDay(new Date(start.getFullYear() + 1, 2, 31));
}

function scaleForDays(days: number): number {
  if (days <= 1) return 0.08;
  if (days <= 7) return 0.22;
  if (days <= 14) return 0.35;
  if (days <= 31) return 0.55;
  if (days <= 92) return 0.78;
  return 1;
}

export function resolveDashboardDateRange(
  preset: DashboardDatePreset,
  customStart?: string,
  customEnd?: string,
  reference = new Date(),
): DashboardDateRange {
  const now = reference;

  if (preset === "custom" && customStart && customEnd) {
    const start = startOfDay(new Date(customStart));
    const end = endOfDay(new Date(customEnd));
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    return {
      preset,
      start,
      end,
      label: `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
      scaleFactor: scaleForDays(days),
    };
  }

  let start: Date;
  let end: Date;

  switch (preset) {
    case "today":
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case "yesterday":
      start = startOfDay(subDays(now, 1));
      end = endOfDay(subDays(now, 1));
      break;
    case "this_week":
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case "last_week": {
      const lastWeek = subWeeks(now, 1);
      start = startOfWeek(lastWeek, { weekStartsOn: 1 });
      end = endOfWeek(lastWeek, { weekStartsOn: 1 });
      break;
    }
    case "this_month":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    }
    case "quarter":
      start = startOfQuarter(now);
      end = endOfQuarter(now);
      break;
    case "financial_year":
      start = getFinancialYearStart(now);
      end = getFinancialYearEnd(now);
      break;
    default:
      start = startOfMonth(now);
      end = endOfMonth(now);
  }

  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const label = preset === "custom" ? "Custom Range" : PRESET_LABELS[preset];

  return { preset, start, end, label, scaleFactor: scaleForDays(days) };
}

export function isWithinRange(isoDate: string, range: DashboardDateRange): boolean {
  const date = new Date(isoDate);
  return date >= range.start && date <= range.end;
}
