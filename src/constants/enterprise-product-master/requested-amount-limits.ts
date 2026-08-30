/**
 * Approved maximum requested-loan amounts — Product Library SSOT.
 *
 * Limits live on CanonicalProductMasterEntry.maxRequestedAmountRupees.
 * Never invent a ceiling for a product that has not been approved.
 * COMPASS and other surfaces must consume these values — they must not
 * maintain a competing product-limit table.
 */

import { getCanonicalProductByCode } from "./canonical-catalog";

const CRORE_RUPEES = 1_00_00_000;

export type RequestedAmountLimitKind = "loan" | "funding";

export type RequestedAmountLimitResult =
  | { ok: true; amount: number }
  | { ok: false; code: "INVALID_AMOUNT" | "AMOUNT_EXCEEDS_PRODUCT_LIMIT"; message: string };

/** Parse a customer/API amount into integer rupees. Rejects non-positive and non-numeric values. */
export function toIntegerRupees(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value);
  }
  if (typeof value === "bigint") {
    if (value <= 0n) return null;
    const n = Number(value);
    if (!Number.isSafeInteger(n)) return null;
    return n;
  }
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0 || !Number.isSafeInteger(n)) return null;
  return n;
}

export function formatIndianRupees(amountRupees: number): string {
  return Math.round(amountRupees).toLocaleString("en-IN");
}

function croreCount(amountRupees: number): number | null {
  if (amountRupees <= 0 || amountRupees % CRORE_RUPEES !== 0) return null;
  return amountRupees / CRORE_RUPEES;
}

export function formatRequestedAmountUpToLabel(
  amountRupees: number,
  kind: RequestedAmountLimitKind = "loan",
): string {
  const crore = croreCount(amountRupees);
  const prefix = kind === "funding" ? "Funding up to" : "Loan amount up to";
  if (crore != null) {
    return `${prefix} ₹${crore.toLocaleString("en-IN")} crore`;
  }
  return `${prefix} ₹${formatIndianRupees(amountRupees)}`;
}

export function formatRequestedAmountScaleLabel(amountRupees: number): string {
  const crore = croreCount(amountRupees);
  if (crore != null) return `₹${crore.toLocaleString("en-IN")} Crore`;
  if (amountRupees >= 1_00_000 && amountRupees % 1_00_000 === 0) {
    return `₹${(amountRupees / 1_00_000).toLocaleString("en-IN")} Lakh`;
  }
  return `₹${formatIndianRupees(amountRupees)}`;
}

export function getApprovedMaxRequestedAmountRupees(
  enterpriseProductCode: string | null | undefined,
): number | null {
  if (!enterpriseProductCode?.trim()) return null;
  const product = getCanonicalProductByCode(enterpriseProductCode);
  const max = product?.maxRequestedAmountRupees;
  if (typeof max !== "number" || !Number.isInteger(max) || max <= 0) return null;
  return max;
}

export function getRequestedAmountLimitKind(
  enterpriseProductCode: string | null | undefined,
): RequestedAmountLimitKind {
  const product = getCanonicalProductByCode(enterpriseProductCode);
  return product?.requestedAmountLimitKind === "funding" ? "funding" : "loan";
}

export function getApprovedRequestedAmountMaxLabel(
  enterpriseProductCode: string | null | undefined,
): string | null {
  const max = getApprovedMaxRequestedAmountRupees(enterpriseProductCode);
  if (max == null) return null;
  return formatRequestedAmountUpToLabel(max, getRequestedAmountLimitKind(enterpriseProductCode));
}

export function requestedAmountExceedsProductLimitMessage(
  enterpriseProductCode: string | null | undefined,
): string {
  const label = getApprovedRequestedAmountMaxLabel(enterpriseProductCode);
  if (label) {
    return `Enter an amount ${label.replace(/^Loan amount /i, "").replace(/^Funding /i, "")}.`;
  }
  return "Enter a valid requested amount.";
}

/**
 * Accept exact approved maximum. Reject max + 1.
 * Products without an approved ceiling are not limited here.
 */
export function assertRequestedAmountWithinProductLimit(input: {
  enterpriseProductCode?: string | null;
  amountRupees: unknown;
}): RequestedAmountLimitResult {
  const amount = toIntegerRupees(input.amountRupees);
  if (amount == null) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "Enter a valid requested amount.",
    };
  }
  const max = getApprovedMaxRequestedAmountRupees(input.enterpriseProductCode);
  if (max != null && amount > max) {
    return {
      ok: false,
      code: "AMOUNT_EXCEEDS_PRODUCT_LIMIT",
      message: requestedAmountExceedsProductLimitMessage(input.enterpriseProductCode),
    };
  }
  return { ok: true, amount };
}

/** True when a range input with integer steps can land on `max`. */
export function integerRangeReachesExactMax(min: number, max: number, step = 1): boolean {
  if (!Number.isInteger(min) || !Number.isInteger(max) || !Number.isInteger(step) || step <= 0) {
    return false;
  }
  if (max < min) return false;
  return (max - min) % step === 0;
}
