/**
 * Exact decimal representation for programme money and percentages.
 * Durable values are decimal strings. JavaScript IEEE floats are rejected.
 */

export type ExactDecimal = string;

const MONEY_RE = /^-?\d+(?:\.\d{1,2})?$/;
const PERCENT_RE = /^-?\d+(?:\.\d{1,6})?$/;

export class ExactDecimalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExactDecimalError";
  }
}

function normalizeDecimalString(raw: string, scale: number): ExactDecimal {
  const trimmed = raw.trim();
  if (!trimmed) throw new ExactDecimalError("Decimal value is required.");
  if (trimmed.toLowerCase().includes("e")) {
    throw new ExactDecimalError("Scientific notation is not an allowed durable decimal.");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  if (!/^-?\d+$/.test(whole)) {
    throw new ExactDecimalError("Decimal value must be a base-10 string.");
  }
  if (fraction.length > scale) {
    throw new ExactDecimalError(`Decimal scale cannot exceed ${scale} places.`);
  }
  const frac = fraction.padEnd(scale, "0");
  const sign = whole.startsWith("-") ? "-" : "";
  const absWhole = whole.replace("-", "").replace(/^0+(?=\d)/, "") || "0";
  return `${sign}${absWhole}.${frac}`;
}

export function parseExactMoney(input: unknown, field: string): ExactDecimal | null {
  if (input === undefined || input === null || input === "") return null;
  if (typeof input === "number") {
    if (!Number.isInteger(input)) {
      throw new ExactDecimalError(
        `${field} must be an exact decimal string, not a JavaScript floating-point number.`,
      );
    }
    return normalizeDecimalString(String(input), 2);
  }
  if (typeof input !== "string") {
    throw new ExactDecimalError(`${field} must be an exact decimal string.`);
  }
  if (!MONEY_RE.test(input.trim())) {
    throw new ExactDecimalError(`${field} is not a valid money decimal (max 2 places).`);
  }
  return normalizeDecimalString(input, 2);
}

export function parseExactPercent(input: unknown, field: string): ExactDecimal | null {
  if (input === undefined || input === null || input === "") return null;
  if (typeof input === "number") {
    if (!Number.isInteger(input)) {
      throw new ExactDecimalError(
        `${field} must be an exact decimal string, not a JavaScript floating-point number.`,
      );
    }
    return normalizeDecimalString(String(input), 6);
  }
  if (typeof input !== "string") {
    throw new ExactDecimalError(`${field} must be an exact decimal string.`);
  }
  if (!PERCENT_RE.test(input.trim())) {
    throw new ExactDecimalError(`${field} is not a valid percentage decimal (max 6 places).`);
  }
  return normalizeDecimalString(input, 6);
}

export function compareExactDecimal(a: ExactDecimal, b: ExactDecimal): number {
  const aNum = BigInt(a.replace(".", "").replace("-", ""));
  const bNum = BigInt(b.replace(".", "").replace("-", ""));
  const aNeg = a.startsWith("-");
  const bNeg = b.startsWith("-");
  if (aNeg !== bNeg) return aNeg ? -1 : 1;
  if (aNum === bNum) return 0;
  const cmp = aNum < bNum ? -1 : 1;
  return aNeg ? -cmp : cmp;
}

export function toPrismaDecimal(value: ExactDecimal | null | undefined): string | null {
  return value ?? null;
}

/** Display-only dual-write into legacy Float columns. Never the durable SSOT. */
export function toLegacyFloat(value: ExactDecimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}
