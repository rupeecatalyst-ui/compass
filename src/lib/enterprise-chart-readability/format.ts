/**
 * CO-C1-CHART-READABILITY-001 — Formatters for chart labels, legends and tooltips.
 * Indian numbering for currency and counts. Never present a series index as a category.
 */

import { formatCount, formatINRCompact } from "@/lib/format-currency";
import {
  ENTERPRISE_CHART_UNIT_LABELS,
} from "@/constants/enterprise-chart-readability";
import type { EnterpriseChartUnit } from "@/types/enterprise-chart-readability";

export function isChartIndexLabel(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 50) {
    return true;
  }
  const s = String(value).trim();
  if (!s) return true;
  if (/^(value|index|series|data|item)$/i.test(s)) return true;
  if (/^\d+$/.test(s) && Number(s) < 50) return true;
  return false;
}

export function resolveChartCategoryLabel(
  candidate: unknown,
  fallback = "Category",
): string {
  if (isChartIndexLabel(candidate)) return fallback;
  return String(candidate).trim();
}

export function formatChartPercent(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return "0%";
  const pct = (part / total) * 100;
  if (pct > 0 && pct < 0.5) return "<1%";
  return `${Math.round(pct)}%`;
}

export function formatChartNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return formatCount(value);
}

export function formatChartValue(value: number, unit: EnterpriseChartUnit): string {
  if (!Number.isFinite(value)) return "—";
  switch (unit) {
    case "inr":
      return formatINRCompact(value);
    case "percent":
      return `${Number(value.toFixed(1))}%`;
    case "days":
      return `${formatCount(Math.round(value))} days`;
    case "score":
      return `${Math.round(value)}`;
    case "ratio":
      return value.toFixed(2);
    default:
      return formatCount(Math.round(value));
  }
}

export function chartUnitLabel(unit: EnterpriseChartUnit): string {
  return ENTERPRISE_CHART_UNIT_LABELS[unit];
}

export function formatChartFreshness(iso?: string | null): string {
  if (!iso) return "Freshness not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Freshness not recorded";
  return `Updated ${d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatChartPeriod(period?: string | null): string {
  const p = period?.trim();
  return p || "Current operational view";
}
