/**
 * COMPASS presentation helpers for Catalyst One journey config.
 * Do not invent field rules here — only apply the projected DTO.
 */

export type CompassJourneyConfigField = {
  fieldId: string;
  label: string;
  helpText?: string;
  fieldType: string;
  required: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  visibleWhenField?: string;
  visibleWhenValues?: string[];
  requiredWhenField?: string;
  requiredWhenValues?: string[];
  notRequiredWhenFilled?: string[];
  maxWhenField?: string;
  maxWhenMap?: Record<string, number>;
};

export type CompassJourneyConfig = {
  productCode: string;
  enterpriseProductCode: string;
  productLabel: string;
  borrowerKind: "individual" | "company";
  configVersion: string;
  fields: CompassJourneyConfigField[];
  requestedAmountMax?: number | null;
  requestedAmountMaxLabel?: string | null;
  dtoSource: string;
};

export function findJourneyField(
  config: CompassJourneyConfig | null | undefined,
  ...ids: string[]
): CompassJourneyConfigField | undefined {
  if (!config?.fields?.length) return undefined;
  return config.fields.find((field) => ids.includes(field.fieldId));
}

export function formatJourneyInrLabel(amount: number): string {
  if (amount >= 1_00_00_000 && amount % 1_00_00_000 === 0) {
    return `₹${(amount / 1_00_00_000).toLocaleString("en-IN")} Crore`;
  }
  if (amount >= 1_00_000 && amount % 1_00_000 === 0) {
    return `₹${(amount / 1_00_000).toLocaleString("en-IN")} Lakh`;
  }
  if (amount >= 1_00_000) {
    const lakh = amount / 1_00_000;
    const text = Number.isInteger(lakh) ? String(lakh) : lakh.toFixed(1).replace(/\.0$/, "");
    return `₹${text} Lakh`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function toIntegerRupees(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value);
  }
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0 || !Number.isSafeInteger(n)) return null;
  return n;
}

export function formatIndianRupees(amount: number): string {
  return Math.round(amount).toLocaleString("en-IN");
}

/**
 * Requested-amount slider bounds from Catalyst One journey config.
 * Widget min/max fallbacks are presentation-only — they never invent a product ceiling.
 */
export function resolveRequestedAmountBounds(
  config: CompassJourneyConfig | null | undefined,
  fallback: { min: number; max: number },
): { min: number; max: number; maxLabel: string | null; hasApprovedMax: boolean } {
  const field = findJourneyField(config, "requestedAmountLabel", "loanAmount");
  const approvedMax = config?.requestedAmountMax ?? field?.max ?? null;
  const hasApprovedMax = typeof approvedMax === "number" && Number.isInteger(approvedMax) && approvedMax > 0;
  const max = hasApprovedMax ? approvedMax : fallback.max;
  const min = field?.min ?? fallback.min;
  return {
    min,
    max,
    maxLabel: config?.requestedAmountMaxLabel ?? null,
    hasApprovedMax,
  };
}

export function requestedAmountExceedsLimit(
  amount: number,
  config: CompassJourneyConfig | null | undefined,
): boolean {
  const max = config?.requestedAmountMax ?? findJourneyField(config, "requestedAmountLabel", "loanAmount")?.max;
  if (typeof max !== "number" || !Number.isInteger(max) || max <= 0) return false;
  return Math.round(amount) > max;
}

export function resolveMonthlyIncomeBounds(
  config: CompassJourneyConfig | null | undefined,
  employmentType: string | undefined,
  fallback: { min: number; max: number },
): { min: number; max: number } {
  const field = findJourneyField(config, "monthlyIncomeLabel", "monthlyIncome");
  const min = field?.min ?? fallback.min;
  const mapped = employmentType && field?.maxWhenMap
    ? field.maxWhenMap[employmentType]
    : undefined;
  const max = mapped ?? field?.max ?? fallback.max;
  return { min, max };
}

function hasFilledValue(value: string | number | boolean | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "boolean") return value;
  const digits = value.replace(/[^0-9.]/g, "");
  if (digits && Number(digits) > 0) return true;
  return value.trim().length > 0;
}

export function isMonthlyIncomeStepRequired(
  config: CompassJourneyConfig | null | undefined,
  answers: Record<string, string | number | boolean | null | undefined>,
): boolean {
  const field = findJourneyField(config, "monthlyIncomeLabel", "monthlyIncome");
  if (!field) return false;
  const employment = String(answers.incomeType || answers.employmentTypeCode || "").trim();
  const turnoverFilled = (field.notRequiredWhenFilled ?? ["annualTurnover", "annualTurnoverLabel"]).some(
    (key) => hasFilledValue(answers[key]),
  );
  if (employment === "salaried") return true;
  if (
    employment === "self-employed-professional" ||
    employment === "self-employed-business" ||
    employment === "professional" ||
    employment === "business"
  ) {
    if (turnoverFilled) return false;
    return true;
  }
  return field.required;
}

export function cibilFieldOptions(
  config: CompassJourneyConfig | null | undefined,
): { value: string; label: string }[] {
  return findJourneyField(config, "approxCibilScore")?.options ?? [];
}
