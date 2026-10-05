/**
 * Public HOME_LOAN recommendation fact projection.
 *
 * Customer answers stay customer answers. Product facts stay product facts.
 * Derived state is computed here for the published-programme matcher and is
 * not written back as a second customer-entered value.
 *
 * Mapping:
 * - legal constitution ← Compass product registry `borrowerKind`
 *   (HOME_LOAN is `individual`; the customer is not asked)
 * - transaction type ← Compass product registry `transactionType`
 *   (HOME_LOAN is `fresh`; the customer is not asked)
 * - age ← governed answer `assessment:borrower.ageYears`
 *   IDC catalog key `ageYears`
 * - residency ← governed answer `assessment:borrower.residency`
 *   IDC catalog key `residency`, stored as borrower.residency
 *   values: resident | nri | pio
 * - property city ← governed answer `propertyCity` (Enterprise City Master id)
 * - property state ← City Master record for that id, then the existing
 *   Indian-state canonicaliser. Not a customer answer.
 */

import { CITY_MASTER_SEED } from "@/data/catalyst-one/city-master-seed";
import { findCityEntry } from "@/constants/city-master";
import {
  COMPASS_PRODUCT_REGISTRY,
  type CompassProductDefinition,
} from "@/constants/compass-customer-gateway/product-registry";
import { mapEmployment } from "@/lib/enterprise-partner-recommendations/project";
import { approxCibilBandToLowerBound } from "@/lib/product-programme-operations/cibil-band";
import type { ProgrammeMatchInput } from "@/lib/product-programme-operations/match-published";
import { canonicalIndianStateCode } from "@/lib/product-programme-operations/pan-india-geography";
import { canonicalizeProductCode } from "@/lib/product-programme-operations/product-aliases";
import type { PartnerOpportunityDetailDto } from "@/types/enterprise-partner-business";

export const HOME_LOAN_AGE_FIELD_ID = "assessment:borrower.ageYears";
export const HOME_LOAN_RESIDENCY_FIELD_ID = "assessment:borrower.residency";
export const HOME_LOAN_PROPERTY_CITY_FIELD_ID = "propertyCity";

export const HOME_LOAN_AGE_ENTRY_MIN = 18;
export const HOME_LOAN_AGE_ENTRY_MAX = 80;

export const HOME_LOAN_RESIDENCY_OPTIONS = [
  { value: "resident", label: "Resident" },
  { value: "nri", label: "NRI" },
  { value: "pio", label: "PIO" },
] as const;

export type HomeLoanResidencyValue = (typeof HOME_LOAN_RESIDENCY_OPTIONS)[number]["value"];

const RESIDENCY_VALUES = new Set<string>(HOME_LOAN_RESIDENCY_OPTIONS.map((item) => item.value));

export function findCompassProductDefinition(
  productCode: string | null | undefined,
): CompassProductDefinition | null {
  const raw = (productCode ?? "").trim();
  if (!raw) return null;
  const canonical = canonicalizeProductCode(raw);
  return (
    COMPASS_PRODUCT_REGISTRY.find(
      (entry) =>
        entry.compassCode === raw ||
        entry.enterpriseProductCode === raw ||
        entry.enterpriseProductCode === canonical,
    ) ?? null
  );
}

export type CityMasterIdentity = {
  id: string;
  city: string;
  state: string;
  stateCode: string;
};

/** City Master id, or an exact city name. Unknown text does not resolve. */
export function resolveCityMasterIdentity(value: string | null | undefined): CityMasterIdentity | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const byId = CITY_MASTER_SEED.find((entry) => entry.id === raw);
  const entry =
    byId ??
    findCityEntry(raw) ??
    CITY_MASTER_SEED.find((item) => item.city.toLowerCase() === raw.toLowerCase());
  if (!entry) return null;
  const stateCode = canonicalIndianStateCode(entry.state);
  if (!stateCode) return null;
  return { id: entry.id, city: entry.city, state: entry.state, stateCode };
}

export function parseHomeLoanEntryAge(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(numeric)) return null;
  if (numeric < HOME_LOAN_AGE_ENTRY_MIN || numeric > HOME_LOAN_AGE_ENTRY_MAX) return null;
  return numeric;
}

export function parseHomeLoanResidency(value: unknown): HomeLoanResidencyValue | null {
  const raw = String(value ?? "").trim().toLowerCase();
  return RESIDENCY_VALUES.has(raw) ? (raw as HomeLoanResidencyValue) : null;
}

function readAnswer(
  borrower: Record<string, string>,
  product: Record<string, string>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = (borrower[key] || product[key] || "").trim();
    if (value) return value;
  }
  return "";
}

export function projectPublicProgrammeMatchInput(
  detail: Pick<
    PartnerOpportunityDetailDto,
    "productCode" | "productLabel" | "borrowerFields" | "productFields" | "requiredAmountLabel"
  >,
): ProgrammeMatchInput {
  const product = findCompassProductDefinition(detail.productCode) ?? findCompassProductDefinition(detail.productLabel);
  const borrower = detail.borrowerFields ?? {};
  const productFields = detail.productFields ?? {};
  const employmentRaw = readAnswer(borrower, productFields, "employmentTypeCode");
  const residencyRaw = readAnswer(
    borrower,
    productFields,
    "residency",
    HOME_LOAN_RESIDENCY_FIELD_ID,
  );
  const ageRaw = readAnswer(borrower, productFields, "ageYears", HOME_LOAN_AGE_FIELD_ID);
  const cityRaw = readAnswer(borrower, productFields, HOME_LOAN_PROPERTY_CITY_FIELD_ID, "propertyCity");
  const city = resolveCityMasterIdentity(cityRaw);
  const amountSource =
    readAnswer(borrower, productFields, "requestedAmountLabel") ||
    (detail.requiredAmountLabel && detail.requiredAmountLabel !== "Not Specified"
      ? detail.requiredAmountLabel
      : "");
  const amount = Number(String(amountSource).replace(/,/g, ""));
  const cibilRaw = readAnswer(borrower, productFields, "approxCibilScore");

  return {
    productCode: product?.enterpriseProductCode ?? null,
    employmentType: employmentRaw ? mapEmployment(employmentRaw) : null,
    constitution: product?.borrowerKind ?? null,
    transactionType: product?.transactionType ?? null,
    residency: parseHomeLoanResidency(residencyRaw),
    state: city?.stateCode ?? null,
    city: city?.city ?? null,
    propertyCategory: readAnswer(borrower, productFields, "propertyCategory") || null,
    constructionStatus: readAnswer(borrower, productFields, "constructionStatus") || null,
    cibil: approxCibilBandToLowerBound(cibilRaw),
    age: parseHomeLoanEntryAge(ageRaw),
    loanAmountExact: Number.isFinite(amount) && amount > 0 ? `${Math.round(amount)}.00` : null,
  };
}
