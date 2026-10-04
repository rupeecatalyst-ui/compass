/**
 * Exact rupee representation for Advantage Committed (₹).
 * Never uses IEEE floating-point arithmetic. Missing ≠ ₹0.
 */

import {
  compareExactDecimal,
  isValidNonNegativeDecimal,
  parseExactDecimal,
} from "@/lib/compass-advantage/exact-decimal";

export function canonicalCommittedRupees(value: unknown): string | null {
  if (value == null || value === "") return null;
  const raw =
    typeof value === "object" && value !== null && "toString" in value
      ? String((value as { toString: () => string }).toString())
      : String(value);
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!isValidNonNegativeDecimal(trimmed)) return null;
  const parsed = parseExactDecimal(trimmed);
  if (parsed.negative) return null;
  const whole = parsed.digits / 10n ** BigInt(parsed.scale);
  if (whole === 0n) return null;
  return whole.toString();
}

export function committedAmountsEqual(left: unknown, right: unknown): boolean {
  const a = canonicalCommittedRupees(left);
  const b = canonicalCommittedRupees(right);
  if (a == null || b == null) return a === b;
  return compareExactDecimal(a, b) === 0;
}

function groupIndianInteger(digits: string): string {
  if (!digits || digits === "0") return "0";
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) groups.unshift(rest);
  return `${groups.join(",")},${last3}`;
}

export function formatAdvantageCommittedInr(amount: string): string {
  const canonical = canonicalCommittedRupees(amount);
  if (canonical == null) {
    throw new Error("cannot_format_missing_or_zero_commitment");
  }
  return `₹${groupIndianInteger(canonical)}`;
}
