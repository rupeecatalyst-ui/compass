/**
 * Exact decimal arithmetic for COMPASS Advantage.
 * Amounts are integer rupees. Rates are decimal strings (e.g. "0.003").
 * Never use IEEE floating-point for commercial calculation.
 */

export type DecimalParts = {
  negative: boolean;
  digits: bigint;
  scale: number;
};

export function parseExactDecimal(value: string): DecimalParts {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "." || trimmed === "-." || trimmed === "-") {
    throw new Error("invalid_decimal");
  }
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  if (!/^\d+(\.\d+)?$/.test(unsigned)) {
    throw new Error("invalid_decimal");
  }
  const [intPart, fracPart = ""] = unsigned.split(".");
  const digits = BigInt(`${intPart}${fracPart}` || "0");
  return { negative, digits, scale: fracPart.length };
}

export function isValidNonNegativeDecimal(value: string | null | undefined): boolean {
  if (value == null || !String(value).trim()) return false;
  try {
    const parsed = parseExactDecimal(String(value));
    return !parsed.negative;
  } catch {
    return false;
  }
}

export function compareExactDecimal(a: string, b: string): number {
  const left = toScaled(parseExactDecimal(a));
  const right = toScaled(parseExactDecimal(b));
  const scale = left.scale > right.scale ? left.scale : right.scale;
  const lv = align(left, scale);
  const rv = align(right, scale);
  if (lv === rv) return 0;
  return lv < rv ? -1 : 1;
}

export function multiplyAmountByRateRoundHalfUp(amountRupees: string, rate: string): string {
  const amount = parseExactDecimal(amountRupees);
  const rateParts = parseExactDecimal(rate);
  if (amount.scale !== 0) {
    throw new Error("loan_amount_must_be_whole_rupees");
  }
  const negative = amount.negative !== rateParts.negative;
  const product = amount.digits * rateParts.digits;
  const rounded = roundHalfUp(product, rateParts.scale);
  if (rounded === 0n) return "0";
  return `${negative ? "-" : ""}${rounded.toString()}`;
}

export function addIntegerDecimals(values: string[]): string {
  let total = 0n;
  for (const value of values) {
    const parsed = parseExactDecimal(value);
    if (parsed.scale !== 0) {
      throw new Error("fixed_benefit_must_be_whole_rupees");
    }
    total += parsed.negative ? -parsed.digits : parsed.digits;
  }
  if (total === 0n) return "0";
  return total < 0n ? `-${(-total).toString()}` : total.toString();
}

export function percentDisplayToRate(percent: string): string {
  const parsed = parseExactDecimal(percent);
  return formatDecimal({
    negative: parsed.negative,
    digits: parsed.digits,
    scale: parsed.scale + 2,
  });
}

export function rateToPercentDisplay(rate: string): string {
  const parsed = parseExactDecimal(rate);
  if (parsed.scale < 2) {
    return formatDecimal({
      negative: parsed.negative,
      digits: parsed.digits * 10n ** BigInt(2 - parsed.scale),
      scale: 0,
    });
  }
  return formatDecimal({
    negative: parsed.negative,
    digits: parsed.digits,
    scale: parsed.scale - 2,
  });
}

export function formatInrFromRupees(amount: string | null | undefined): string | null {
  if (amount == null || amount === "") return null;
  const parsed = parseExactDecimal(amount);
  const sign = parsed.negative ? "-" : "";
  return `₹${sign}${formatIndianInteger(parsed.digits.toString())}`;
}

function toScaled(parts: DecimalParts): { value: bigint; scale: number } {
  const signed = parts.negative ? -parts.digits : parts.digits;
  return { value: signed, scale: parts.scale };
}

function align(parts: { value: bigint; scale: number }, scale: number): bigint {
  const delta = scale - parts.scale;
  return parts.value * 10n ** BigInt(delta);
}

function roundHalfUp(value: bigint, scale: number): bigint {
  if (scale <= 0) return value;
  const divisor = 10n ** BigInt(scale);
  const half = divisor / 2n;
  const quotient = value / divisor;
  const remainder = value % divisor;
  if (remainder >= half) return quotient + 1n;
  return quotient;
}

function formatIndianInteger(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${lastThree}`;
}

function formatDecimal(parts: DecimalParts): string {
  const digits = parts.digits.toString().padStart(parts.scale + 1, "0");
  const intPart = parts.scale === 0 ? digits : digits.slice(0, digits.length - parts.scale);
  const fracPart = parts.scale === 0 ? "" : digits.slice(digits.length - parts.scale);
  const body = fracPart.replace(/0+$/, "") ? `${intPart}.${fracPart.replace(/0+$/, "")}` : intPart;
  if (parts.negative && body !== "0") return `-${body}`;
  return body;
}
