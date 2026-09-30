/**
 * CHANAKYA Phase A — canonical Opportunity recommendation facts.
 * Lead Information owns capture. Product Programme still decides eligibility.
 * Lender inventory does not decide whether these facts exist.
 * No database. No assessment. No recommendation execution.
 */

import type { LeadInformationFormState } from "@/constants/lead-information-workspace";
import { GOVERNED_PROPERTY_CATEGORIES } from "@/constants/product-journey/property-category";
import {
  PROGRAMME_CONSTRUCTION_STATUSES,
  PROGRAMME_RESIDENCY,
} from "@/constants/product-programme-operations/controlled-masters";

export const HOME_LOAN_CANONICAL_FACT_PRODUCTS = ["HOME_LOAN", "HOME_LOAN_BT"] as const;

/** Customer residency values from the programme residency master. Programme "not applicable" is not a customer fact. */
export const CANONICAL_RESIDENCY_VALUES = PROGRAMME_RESIDENCY.map((item) => item.id).filter(
  (id) => id !== "not_applicable",
);

export const CANONICAL_PROPERTY_CATEGORIES = GOVERNED_PROPERTY_CATEGORIES;
export const CANONICAL_CONSTRUCTION_STATUSES = PROGRAMME_CONSTRUCTION_STATUSES.map((item) => item.id);

/** Same answers as Opportunity Assessment repayment track. */
export const CANONICAL_REPAYMENT_TRACKS = ["yes", "no", "not_sure"] as const;

const INT4_MAX = 2147483647;
const ROI_STORAGE_MAX = 9999.9999;

export type CanonicalRecommendationFactWrite = {
  requestedTenureMonths: number | null;
  monthlyIncomeRupees: number | null;
  existingMonthlyObligationsRupees: number | null;
  propertyValueRupees: number | null;
  propertyCategory: string | null;
  constructionStatus: string | null;
  residency: string | null;
  currentRoiPercent: number | null;
  currentHomeLoanEmiRupees: number | null;
  remainingTenureMonths: number | null;
  loanStartDate: Date | null;
  repaymentTrack: string | null;
  delayedEmiCount: number | null;
};

export type CanonicalFactField = keyof CanonicalRecommendationFactWrite;

export function isHomeLoanCanonicalFactProduct(productCode: string | null | undefined): boolean {
  return (HOME_LOAN_CANONICAL_FACT_PRODUCTS as readonly string[]).includes(
    (productCode ?? "").trim(),
  );
}

export function isHlbtCanonicalFactJourney(
  productCode: string | null | undefined,
  transactionType: string | null | undefined,
): boolean {
  return (
    (productCode ?? "").trim() === "HOME_LOAN_BT" ||
    (transactionType ?? "").trim() === "balance_transfer"
  );
}

export function isSalariedEmployment(employmentTypeCode: string | null | undefined): boolean {
  return (employmentTypeCode ?? "").trim() === "salaried";
}

type ParseResult = { ok: true; value: number | string | Date | null } | { ok: false; message: string };

function blank(raw: unknown): boolean {
  return raw == null || (typeof raw === "string" && raw.trim() === "");
}

function numericText(raw: unknown): string | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return String(raw);
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/,/g, "");
  return trimmed || null;
}

function parsePositiveIntegerMonths(raw: unknown, label: string): ParseResult {
  if (blank(raw)) return { ok: true, value: null };
  const text = numericText(raw);
  if (text == null || /[eE.]/.test(text)) {
    return { ok: false, message: `Enter ${label} as a positive whole number of months.` };
  }
  const n = Number(text);
  if (!Number.isInteger(n) || n <= 0 || n > INT4_MAX) {
    return { ok: false, message: `Enter ${label} as a positive whole number of months.` };
  }
  return { ok: true, value: n };
}

function parseMoney(
  raw: unknown,
  label: string,
  allowZero: boolean,
): ParseResult {
  if (blank(raw)) return { ok: true, value: null };
  const text = numericText(raw);
  if (text == null || /[eE]/.test(text)) {
    return {
      ok: false,
      message: allowZero
        ? `Enter zero or a positive ${label}.`
        : `Enter a positive ${label}.`,
    };
  }
  const n = Number(text);
  if (!Number.isFinite(n) || !Number.isSafeInteger(Math.round(n))) {
    return {
      ok: false,
      message: allowZero
        ? `Enter zero or a positive ${label}.`
        : `Enter a positive ${label}.`,
    };
  }
  const rounded = Math.round(n * 100) / 100;
  if (rounded < 0 || (!allowZero && rounded <= 0)) {
    return {
      ok: false,
      message: allowZero
        ? `Enter zero or a positive ${label}.`
        : `Enter a positive ${label}.`,
    };
  }
  return { ok: true, value: rounded };
}

function parseRoi(raw: unknown): ParseResult {
  if (blank(raw)) return { ok: true, value: null };
  const text = numericText(raw);
  if (text == null || /[eE]/.test(text)) {
    return { ok: false, message: "Enter a positive current ROI." };
  }
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || n > ROI_STORAGE_MAX) {
    return { ok: false, message: "Enter a positive current ROI." };
  }
  return { ok: true, value: Math.round(n * 10000) / 10000 };
}

function parseNonNegativeInt(raw: unknown, label: string): ParseResult {
  if (blank(raw)) return { ok: true, value: null };
  const text = numericText(raw);
  if (text == null || /[eE.]/.test(text)) {
    return { ok: false, message: `Enter zero or a positive whole number of ${label}.` };
  }
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0 || n > INT4_MAX) {
    return { ok: false, message: `Enter zero or a positive whole number of ${label}.` };
  }
  return { ok: true, value: n };
}

function parseControlled(
  raw: unknown,
  allowed: readonly string[],
  label: string,
): ParseResult {
  if (blank(raw)) return { ok: true, value: null };
  const value = String(raw).trim();
  if (!allowed.includes(value)) {
    return { ok: false, message: `Select a valid ${label}.` };
  }
  return { ok: true, value };
}

function parseLoanStartDate(raw: unknown): ParseResult {
  if (blank(raw)) return { ok: true, value: null };
  const text = String(raw).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return { ok: false, message: "Enter a valid loan start date." };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, message: "Enter a valid loan start date." };
  }
  return { ok: true, value: date };
}

const NULL_WRITE: CanonicalRecommendationFactWrite = {
  requestedTenureMonths: null,
  monthlyIncomeRupees: null,
  existingMonthlyObligationsRupees: null,
  propertyValueRupees: null,
  propertyCategory: null,
  constructionStatus: null,
  residency: null,
  currentRoiPercent: null,
  currentHomeLoanEmiRupees: null,
  remainingTenureMonths: null,
  loanStartDate: null,
  repaymentTrack: null,
  delayedEmiCount: null,
};

export function canonicalFactsForLeadInformation(
  form: LeadInformationFormState,
): { ok: true; facts: CanonicalRecommendationFactWrite } | { ok: false; field: CanonicalFactField; message: string } {
  if (!isHomeLoanCanonicalFactProduct(form.productCode)) {
    return { ok: true, facts: { ...NULL_WRITE } };
  }

  const tenure = parsePositiveIntegerMonths(form.requestedTenureMonths, "requested tenure");
  if (!tenure.ok) return { ok: false, field: "requestedTenureMonths", message: tenure.message };
  const obligations = parseMoney(form.existingMonthlyObligationsRupees, "monthly obligations", true);
  if (!obligations.ok) {
    return { ok: false, field: "existingMonthlyObligationsRupees", message: obligations.message };
  }
  const propertyValue = parseMoney(form.propertyValueRupees, "property value", false);
  if (!propertyValue.ok) return { ok: false, field: "propertyValueRupees", message: propertyValue.message };
  const category = parseControlled(form.propertyCategory, CANONICAL_PROPERTY_CATEGORIES, "property category");
  if (!category.ok) return { ok: false, field: "propertyCategory", message: category.message };
  const construction = parseControlled(
    form.constructionStatus,
    CANONICAL_CONSTRUCTION_STATUSES,
    "construction status",
  );
  if (!construction.ok) return { ok: false, field: "constructionStatus", message: construction.message };
  const residency = parseControlled(form.residency, CANONICAL_RESIDENCY_VALUES, "residency");
  if (!residency.ok) return { ok: false, field: "residency", message: residency.message };

  let income: ParseResult = { ok: true, value: null };
  if (isSalariedEmployment(form.employmentTypeCode)) {
    income = parseMoney(form.monthlyIncomeRupees, "monthly income", false);
    if (!income.ok) return { ok: false, field: "monthlyIncomeRupees", message: income.message };
  }

  const facts: CanonicalRecommendationFactWrite = {
    ...NULL_WRITE,
    requestedTenureMonths: tenure.value as number | null,
    monthlyIncomeRupees: income.value as number | null,
    existingMonthlyObligationsRupees: obligations.value as number | null,
    propertyValueRupees: propertyValue.value as number | null,
    propertyCategory: category.value as string | null,
    constructionStatus: construction.value as string | null,
    residency: residency.value as string | null,
  };

  if (!isHlbtCanonicalFactJourney(form.productCode, form.transactionType)) {
    return { ok: true, facts };
  }

  const roi = parseRoi(form.currentRoiPercent);
  if (!roi.ok) return { ok: false, field: "currentRoiPercent", message: roi.message };
  const emi = parseMoney(form.currentHomeLoanEmiRupees, "current home loan EMI", false);
  if (!emi.ok) return { ok: false, field: "currentHomeLoanEmiRupees", message: emi.message };
  const remaining = parsePositiveIntegerMonths(form.remainingTenureMonths, "remaining tenure");
  if (!remaining.ok) return { ok: false, field: "remainingTenureMonths", message: remaining.message };
  const start = parseLoanStartDate(form.loanStartDate);
  if (!start.ok) return { ok: false, field: "loanStartDate", message: start.message };
  const track = parseControlled(form.repaymentTrack, CANONICAL_REPAYMENT_TRACKS, "repayment track");
  if (!track.ok) return { ok: false, field: "repaymentTrack", message: track.message };
  const delayed = parseNonNegativeInt(form.delayedEmiCount, "delayed EMIs");
  if (!delayed.ok) return { ok: false, field: "delayedEmiCount", message: delayed.message };

  facts.currentRoiPercent = roi.value as number | null;
  facts.currentHomeLoanEmiRupees = emi.value as number | null;
  facts.remainingTenureMonths = remaining.value as number | null;
  facts.loanStartDate = start.value as Date | null;
  facts.repaymentTrack = track.value as string | null;
  facts.delayedEmiCount = delayed.value as number | null;
  return { ok: true, facts };
}

const PATCH_KEYS: CanonicalFactField[] = [
  "requestedTenureMonths",
  "monthlyIncomeRupees",
  "existingMonthlyObligationsRupees",
  "propertyValueRupees",
  "propertyCategory",
  "constructionStatus",
  "residency",
  "currentRoiPercent",
  "currentHomeLoanEmiRupees",
  "remainingTenureMonths",
  "loanStartDate",
  "repaymentTrack",
  "delayedEmiCount",
];

/**
 * Server parse for an Opportunity update body.
 * Absent keys are left untouched. Present keys must match Lead Information semantics.
 * Monthly income is rejected unless employment is salaried.
 */
export function parseCanonicalRecommendationFactBody(
  body: Record<string, unknown>,
  employmentTypeCode: string | null,
): { ok: true; patch: Partial<CanonicalRecommendationFactWrite> } | { ok: false; message: string } {
  const present = PATCH_KEYS.filter((key) => body[key] !== undefined);
  if (present.length === 0) return { ok: true, patch: {} };

  const patch: Partial<CanonicalRecommendationFactWrite> = {};
  for (const key of present) {
    const raw = body[key];
    let parsed: ParseResult;
    if (key === "requestedTenureMonths") parsed = parsePositiveIntegerMonths(raw, "requested tenure");
    else if (key === "remainingTenureMonths") parsed = parsePositiveIntegerMonths(raw, "remaining tenure");
    else if (key === "monthlyIncomeRupees") parsed = parseMoney(raw, "monthly income", false);
    else if (key === "existingMonthlyObligationsRupees") {
      parsed = parseMoney(raw, "monthly obligations", true);
    } else if (key === "propertyValueRupees") parsed = parseMoney(raw, "property value", false);
    else if (key === "currentHomeLoanEmiRupees") parsed = parseMoney(raw, "current home loan EMI", false);
    else if (key === "currentRoiPercent") parsed = parseRoi(raw);
    else if (key === "delayedEmiCount") parsed = parseNonNegativeInt(raw, "delayed EMIs");
    else if (key === "loanStartDate") parsed = parseLoanStartDate(raw);
    else if (key === "propertyCategory") {
      parsed = parseControlled(raw, CANONICAL_PROPERTY_CATEGORIES, "property category");
    } else if (key === "constructionStatus") {
      parsed = parseControlled(raw, CANONICAL_CONSTRUCTION_STATUSES, "construction status");
    } else if (key === "residency") parsed = parseControlled(raw, CANONICAL_RESIDENCY_VALUES, "residency");
    else parsed = parseControlled(raw, CANONICAL_REPAYMENT_TRACKS, "repayment track");

    if (!parsed.ok) return { ok: false, message: parsed.message };
    if (key === "monthlyIncomeRupees" && parsed.value != null && !isSalariedEmployment(employmentTypeCode)) {
      return {
        ok: false,
        message: "Monthly income is captured only for salaried employment.",
      };
    }
    (patch as Record<string, unknown>)[key] = parsed.value;
  }
  return { ok: true, patch };
}

export function storedCanonicalNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

export function storedCanonicalDate(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return "";
}
