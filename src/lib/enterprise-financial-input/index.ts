/**
 * CO-UX-015 — Enterprise Financial Input convert helpers.
 * Absolute rupee integer remains the storage / calculation SSOT.
 */

import {
  ENTERPRISE_FINANCIAL_DEFAULT_UNIT,
  ENTERPRISE_FINANCIAL_UNIT_MULTIPLIERS,
  type EnterpriseFinancialUnit,
} from "@/constants/enterprise-financial-input";
import { formatINR } from "@/lib/format-currency";

export function financialUnitMultiplier(unit: EnterpriseFinancialUnit): number {
  return ENTERPRISE_FINANCIAL_UNIT_MULTIPLIERS[unit];
}

/** Prefer the largest unit that keeps the magnitude readable (≥ 1, otherwise next smaller). */
export function inferFinancialUnit(
  absoluteRupees: number | null | undefined,
): EnterpriseFinancialUnit {
  const n = Number(absoluteRupees);
  if (!Number.isFinite(n) || n <= 0) return ENTERPRISE_FINANCIAL_DEFAULT_UNIT;
  if (n >= ENTERPRISE_FINANCIAL_UNIT_MULTIPLIERS.crore) return "crore";
  if (n >= ENTERPRISE_FINANCIAL_UNIT_MULTIPLIERS.lakh) return "lakh";
  return "thousand";
}

export function absoluteToUnitMagnitude(
  absoluteRupees: number | null | undefined,
  unit: EnterpriseFinancialUnit,
): number | null {
  const n = Number(absoluteRupees);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return 0;
  const mag = n / financialUnitMultiplier(unit);
  return Number.isFinite(mag) ? mag : null;
}

/**
 * Convert unit magnitude → absolute rupees (rounded to nearest rupee).
 * Rejects negative / non-finite. Empty → null.
 */
export function unitMagnitudeToAbsolute(
  magnitude: number | null | undefined,
  unit: EnterpriseFinancialUnit,
): number | null {
  if (magnitude == null) return null;
  if (!Number.isFinite(magnitude) || magnitude < 0) return null;
  if (magnitude === 0) return 0;
  const absolute = Math.round(magnitude * financialUnitMultiplier(unit));
  return Number.isFinite(absolute) ? absolute : null;
}

/** Parse typed magnitude text (allows decimals, rejects negatives / junk). */
export function parseFinancialMagnitudeInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function formatFinancialMagnitudeInput(
  magnitude: number | null | undefined,
): string {
  if (magnitude == null || !Number.isFinite(magnitude)) return "";
  if (magnitude === 0) return "0";
  // Keep up to 4 decimals for 2.5 / 12.75 style entry without trailing zeros noise
  const fixed = Number(magnitude.toFixed(4));
  return String(fixed);
}

export function formatFinancialEquivalent(absoluteRupees: number | null | undefined): string {
  const n = Number(absoluteRupees);
  if (!Number.isFinite(n) || n <= 0) return "";
  return formatINR(n);
}

/**
 * Bridge string form fields → absolute rupees for EnterpriseFinancialInput.
 * Strips optional `override:` credit-bench prefix and Indian grouping commas.
 * Does not invent values — unparseable → undefined.
 */
export function absoluteRupeesFromStoredString(
  raw: string | null | undefined,
): number | undefined {
  if (raw == null) return undefined;
  const cleaned = String(raw)
    .replace(/^override:/i, "")
    .trim()
    .replace(/,/g, "");
  if (!cleaned) return undefined;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return undefined;
  const absolute = Math.round(n);
  return absolute > 0 ? absolute : undefined;
}

export function absoluteRupeesToStoredString(
  absolute: number | undefined,
  options?: { overridePrefix?: boolean },
): string {
  if (absolute == null || !Number.isFinite(absolute) || absolute <= 0) return "";
  const body = String(Math.round(absolute));
  return options?.overridePrefix ? `override:${body}` : body;
}
