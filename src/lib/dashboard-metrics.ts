import type { DashboardDateRange } from "@/lib/dashboard-date-utils";
import { formatINRCompact } from "@/lib/format-currency";

export function scaleCount(base: number, scaleFactor: number): number {
  return Math.max(1, Math.round(base * scaleFactor));
}

export function scaleCurrency(baseCr: number, scaleFactor: number): string {
  const scaled = baseCr * scaleFactor;
  if (scaled >= 1) return `₹${scaled.toFixed(1)} Cr`;
  return formatINRCompact(scaled * 10_000_000);
}

export function scaleLakhs(baseL: number, scaleFactor: number): string {
  const scaled = baseL * scaleFactor;
  if (scaled >= 100) return `₹${(scaled / 100).toFixed(1)} Cr`;
  return `₹${scaled.toFixed(1)} L`;
}

export function filterActivityByRange<T extends { timestamp: string }>(
  items: T[],
  range: DashboardDateRange,
): T[] {
  return items.filter((item) => {
    const date = new Date(item.timestamp);
    return date >= range.start && date <= range.end;
  });
}

export function getPeriodLabel(range: DashboardDateRange): string {
  return range.label;
}
