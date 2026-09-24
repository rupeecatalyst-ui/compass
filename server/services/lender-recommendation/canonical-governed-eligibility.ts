import type { CanonicalAssessmentProgramme } from "./programme-assessment-adapter";
import type { CanonicalAssessmentField, CanonicalLenderRecommendationRequest } from "@/types/canonical-lender-recommendation";
import { calculateReducingBalanceEmi } from "@/lib/home-loan-recommendation/tenure";
import { calculateSalariedFoir } from "@/lib/home-loan-recommendation/foir";
import { contributingCoApplicantIncomeRupees } from "@/lib/product-recommendation/home-loan-inputs";
import { resolveHomeLoanCibilCategoryUniverse } from "@/lib/product-recommendation/home-loan-cibil-universe";
import type { ProgrammeAssessmentCard } from "@/lib/home-loan-recommendation/engine";
import {
  customerFactsForAdditionalFilters,
  evaluateAdditionalEligibilityFilters,
} from "@/lib/product-programme-operations/additional-eligibility-filters";
import { constraintKeyForField } from "@/lib/product-programme-operations/additional-eligibility-filters";

type Customer = CanonicalLenderRecommendationRequest["customer"];

const FILTER_FIELD_TO_ASSESSMENT: Record<string, CanonicalAssessmentField> = {
  constructionStatus: "constructionStatus",
  propertyCategory: "propertyType",
  employment: "employment",
  city: "city",
  state: "state",
  residency: "residency",
  constitution: "constitution",
  age: "dateOfBirth",
  cibil: "cibil",
  income: "monthlyIncome",
};

function mapFilterFieldsToAssessment(fieldIds: string[]): CanonicalAssessmentField[] {
  const mapped = fieldIds
    .map((id) => FILTER_FIELD_TO_ASSESSMENT[constraintKeyForField(id) ?? ""] ?? null)
    .filter((item): item is CanonicalAssessmentField => item != null);
  return mapped.length ? mapped : [];
}
export type GovernedVerdict = { reason: string; missingInputs: CanonicalAssessmentField[] };
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const positive = (v: unknown): v is number => finite(v) && v > 0;
const nonnegative = (v: unknown): v is number => finite(v) && v >= 0;
const number = (v: string | number | null | undefined) => v == null ? null : Number(v);
const within = (value: number, min: string | number | null | undefined, max: string | number | null | undefined) =>
  (min == null || value >= Number(min)) && (max == null || value <= Number(max));
const rejected = (reason: string, missingInputs: CanonicalAssessmentField[] = []): GovernedVerdict => ({ reason, missingInputs });

/** Calendar-valid completed months at the assessment clock; no age inference. */
function monthsSince(value: unknown, asOf: Date): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date > asOf) return null;
  return (asOf.getUTCFullYear() - date.getUTCFullYear()) * 12 + asOf.getUTCMonth() - date.getUTCMonth()
    - (asOf.getUTCDate() < date.getUTCDate() ? 1 : 0);
}

/** A band is an interval, never an invented exact score. Open-ended bands stay open. */
function cibilInterval(value: Customer["cibilBand"]): [number, number] | "unknown" | null {
  if (finite(value) && Number.isInteger(value) && /^\d{3}$/.test(String(value))) return [value, value];
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (["not_known", "not known", "unknown"].includes(raw)) return "unknown";
  if (/^\d{3}$/.test(raw)) return [Number(raw), Number(raw)];
  if (raw === "below_600") return [Number.NEGATIVE_INFINITY, 599];
  if (raw === "800_plus") return [800, Number.POSITIVE_INFINITY];
  if (["600_649", "650_699", "700_749", "750_799"].includes(raw)) return raw.split("_").map(Number) as [number, number];
  return null;
}

export function evaluateCanonicalEligibility(programme: CanonicalAssessmentProgramme, customer: Customer, asOf: Date): GovernedVerdict | null {
  const c = programme.canonicalConstraints;
  // FOIR is the only affordability ratio. Persisted DBR bounds are not recommendation eligibility.
  // requiredDocumentTypeIds remain programme LOD; they are not a lender-eligibility reject.
  if (c.unsupportedConstraintPresent || customer.employmentFamily === "self_employed" ||
      programme.selfEmployedMethodologyPresent === true) return rejected("UNSUPPORTED_GOVERNED_RULE");
  const expectedJourney = programme.canonicalProduct === "HOME_LOAN" ? "home_loan" : "home_loan_balance_transfer";
  if (customer.journeyKind !== expectedJourney) return rejected("PRODUCT_CONTEXT_MISMATCH");
  // No fresh/top-up inference. A nonblank HL transaction restriction has no supported native context.
  if (programme.canonicalProduct === "HOME_LOAN" && c.transactionTypes?.length) return rejected("UNSUPPORTED_GOVERNED_RULE");

  const missing = new Set<CanonicalAssessmentField>();
  let mismatch = false;
  function allowed(value: string | null | undefined, values: string[] | null | undefined, field: CanonicalAssessmentField) {
    if (!values?.length) return;
    if (!value?.trim()) missing.add(field);
    else if (!values.includes(value)) mismatch = true;
  }
  allowed(customer.residency, c.residency, "residency");
  allowed(customer.employmentType, c.employmentTypes, "employment");
  allowed(customer.constitution, c.legalConstitutions, "constitution");
  allowed(customer.city, c.eligibleCities, "city");
  allowed(customer.state, c.eligibleStates, "state");
  allowed(customer.propertyType, c.propertyCategories, "propertyType");
  allowed(customer.constructionStatus, c.constructionStatuses, "constructionStatus");
  allowed(customer.propertyKind, programme.allowedPropertyKinds, "propertyType");
  allowed(customer.constructionStatus, programme.allowedConstructionStatuses, "constructionStatus");
  allowed(customer.occupancy, programme.allowedOccupancy, "occupancy");
  allowed(customer.possessionStatus, programme.allowedPossession, "possession");
  allowed(customer.registrationStatus, programme.allowedRegistration, "registration");

  const interval = cibilInterval(customer.cibilBand);
  const ranges = [{ minimum: c.minCibil, maximum: c.maxCibil }, ...programme.parsedPolicyRules.cibilRanges];
  if (interval == null) missing.add("cibil");
  else if (interval === "unknown") {
    if (ranges.some(r => r.minimum != null || r.maximum != null)) missing.add("cibil");
  } else {
    for (const range of ranges) {
      if ((range.minimum != null && interval[1] < range.minimum) || (range.maximum != null && interval[0] > range.maximum)) mismatch = true;
      else if (!within(interval[0], range.minimum, null) || !within(interval[1], null, range.maximum)) missing.add("cibil");
    }
  }
  if (!programme.lenderCategory || !resolveHomeLoanCibilCategoryUniverse(customer.cibilBand).permittedCategories.includes(programme.lenderCategory)) mismatch = true;

  const tenure = customer.customerSelectedTenureMonths;
  // Required for EMI/FOIR calculation even when no programme tenure bound is populated.
  if (!positive(tenure) || !Number.isInteger(tenure)) missing.add("requestedTenure");
  else if (!within(tenure, c.minTenureMonths, c.maxTenureMonths)) mismatch = true;
  const age =
    monthsSince(customer.dateOfBirth, asOf) ??
    (customer.ageYears != null && Number.isFinite(customer.ageYears) && customer.ageYears > 0
      ? Math.round(customer.ageYears * 12)
      : null);
  if (c.minAge != null || c.maxAge != null || programme.maxAgeAtMaturityYears != null) {
    if (age == null) missing.add("dateOfBirth");
    else if (!within(age, c.minAge == null ? null : c.minAge * 12, c.maxAge == null ? null : c.maxAge * 12)) mismatch = true;
  }
  const maturity = programme.maxAgeAtMaturityYears ?? c.maxAge;
  if (maturity != null) {
    const party = programme.ageGoverningParty;
    const coAge = monthsSince(customer.coApplicant?.dateOfBirth, asOf);
    let governing = age;
    if (party === "co_applicant") governing = coAge;
    if (party === "younger" || party === "older") {
      governing = age == null || coAge == null ? null : party === "younger" ? Math.min(age, coAge) : Math.max(age, coAge);
    }
    if (governing == null) missing.add(party && party !== "applicant" ? "coApplicant" : "dateOfBirth");
    // Requested tenure above age-permitted tenure reduces EffectiveAvailableTenure.
    // It is not an automatic programme exclusion.
  }

  if (customer.employmentFamily !== "salaried") missing.add("employment");
  if (!positive(customer.monthlyIncomeRupees)) missing.add("monthlyIncome");
  else if (!within(customer.monthlyIncomeRupees, c.minIncomeRupees, c.maxIncomeRupees)) mismatch = true;
  if (!nonnegative(customer.existingMonthlyEmiRupees)) missing.add("obligations");
  if (!positive(customer.propertyValueRupees)) missing.add("propertyValue");
  if (!positive(customer.requiredAmountRupees)) missing.add("requestedAmount");
  else if (!within(customer.requiredAmountRupees, c.minLoanAmountRupees, c.maxLoanAmountRupees)) mismatch = true;
  if (customer.coApplicantDecision === "yes" && !customer.coApplicant) missing.add("coApplicant");
  if (customer.coApplicantDecision === "yes" && customer.coApplicant) {
    if (!nonnegative(customer.coApplicant.existingMonthlyEmiRupees)) missing.add("coApplicant");
    if (programme.acceptsCoApplicantIncome === true) {
      if (!customer.coApplicant.employmentType) missing.add("coApplicant");
      else if (customer.coApplicant.employmentType !== "salaried") return rejected("UNSUPPORTED_GOVERNED_RULE");
      if (!positive(customer.coApplicant.monthlyIncomeRupees)) missing.add("coApplicant");
    }
  }

  if (programme.canonicalProduct === "HOME_LOAN_BT") {
    if (!positive(customer.currentOutstandingRupees) || customer.currentOutstandingCertainty === "not_known") missing.add("btOutstanding");
    else if (positive(customer.requiredAmountRupees) && customer.requiredAmountRupees > customer.currentOutstandingRupees) mismatch = true;
    if (programme.requiredSeasoningMonths != null) {
      const seasoning = monthsSince(customer.loanStartDate, asOf);
      if (seasoning == null || customer.loanStartDateCertainty !== "exact") missing.add("loanStartDate");
      else if (seasoning < programme.requiredSeasoningMonths) mismatch = true;
    }
    if (programme.repaymentCleanRequired === true) {
      if (!customer.repaymentTrack || customer.repaymentTrack === "not_sure") missing.add("repaymentTrack");
      else if (customer.repaymentTrack !== "yes") mismatch = true;
    }
    if (programme.maxDelayedEmis != null) {
      if (!nonnegative(customer.delayedEmiCount) || !Number.isInteger(customer.delayedEmiCount)) missing.add("delayedEmis");
      else if (customer.delayedEmiCount > programme.maxDelayedEmis) mismatch = true;
    }
  } else if (programme.requiredSeasoningMonths != null || programme.repaymentCleanRequired === true || programme.maxDelayedEmis != null) {
    return rejected("UNSUPPORTED_GOVERNED_RULE");
  }
  if (missing.size) return rejected("ASSESSMENT_INPUT_REQUIRED", [...missing]);
  if (mismatch) return rejected("ELIGIBILITY_NOT_MET");
  const additional = evaluateAdditionalEligibilityFilters({
    filters: programme.additionalEligibilityFilters,
    facts: customerFactsForAdditionalFilters(customer, asOf),
  });
  if (additional.result === "INPUT_REQUIRED") {
    return rejected("ASSESSMENT_INPUT_REQUIRED", mapFilterFieldsToAssessment(additional.missingFieldIds));
  }
  if (additional.result === "CONFIGURATION_INVALID" || additional.result === "CONFLICT") {
    return rejected("PROGRAMME_CONFIGURATION_INVALID");
  }
  if (additional.result === "FAIL") return rejected("ELIGIBILITY_NOT_MET");
  // Programme FOIR norm is required to calculate FOIR. No global default. Above-norm FOIR is not an automatic reject.
  // Missing comparable ROI must not eliminate an otherwise eligible programme.
  if (c.maxFoirPercent == null) return rejected("PROGRAMME_CONFIGURATION_INVALID");
  const roi = number(c.minRoiPercent);
  if (roi != null) {
    const coIncome = contributingCoApplicantIncomeRupees({
      acceptsCoApplicantIncome: programme.acceptsCoApplicantIncome,
      coApplicantDecision: customer.coApplicantDecision,
      coApplicantIncomeRupees: customer.coApplicant?.monthlyIncomeRupees,
    });
    const income = customer.monthlyIncomeRupees! + coIncome;
    const obligations = customer.existingMonthlyEmiRupees! +
      (customer.coApplicantDecision === "yes" ? (customer.coApplicant?.existingMonthlyEmiRupees ?? 0) : 0);
    const emi = calculateReducingBalanceEmi({ principalRupees: customer.requiredAmountRupees!, annualRoiPercent: roi, tenureMonths: tenure! });
    const foir = calculateSalariedFoir({ eligibleMonthlyIncomeRupees: income, existingMonthlyEmiRupees: obligations,
      proposedMonthlyEmiRupees: emi, maxFoirPercent: number(c.maxFoirPercent) });
    if (emi == null || foir.foirPercent == null) {
      return rejected("PROGRAMME_CONFIGURATION_INVALID");
    }
  }
  const ltv = customer.requiredAmountRupees! / customer.propertyValueRupees! * 100;
  // Conservative rejection is permitted: no lower amount is presented as approval for the request.
  if (!within(ltv, c.minLtvPercent, c.maxLtvPercent)) return rejected("ELIGIBILITY_NOT_MET");
  return null;
}

/** Final output proof: a shared calculation must not turn a rejected constraint into a conditional card. */
export function canonicalCardSatisfies(programme: CanonicalAssessmentProgramme, customer: Customer, card: ProgrammeAssessmentCard): boolean {
  const c = programme.canonicalConstraints;
  const roiMissing = !finite(card.applicableRoiPercent);
  if (!positive(card.tentativeOfferRupees) || card.lenderId !== programme.lenderId ||
      card.propertyValueConsideredRupees !== customer.propertyValueRupees || !positive(card.tenureMonths)) return false;
  if (positive(customer.customerSelectedTenureMonths) && card.tenureMonths > customer.customerSelectedTenureMonths) return false;
  if (!roiMissing && (!positive(card.indicativeEmiRupees) || !finite(card.foirPercent))) return false;
  const income = customer.monthlyIncomeRupees! + contributingCoApplicantIncomeRupees({
    acceptsCoApplicantIncome: programme.acceptsCoApplicantIncome,
    coApplicantDecision: customer.coApplicantDecision,
    coApplicantIncomeRupees: customer.coApplicant?.monthlyIncomeRupees,
  });
  const obligations = customer.existingMonthlyEmiRupees! +
    (customer.coApplicantDecision === "yes" ? (customer.coApplicant?.existingMonthlyEmiRupees ?? 0) : 0);
  return ["standard_match", "exact_match", "closest_feasible_option", "conditional_match"].includes(card.matchState)
    && card.tentativeOfferRupees <= customer.requiredAmountRupees!
    && within(card.tentativeOfferRupees, c.minLoanAmountRupees, c.maxLoanAmountRupees)
    && (roiMissing || (finite(card.foirPercent)
      && finite((obligations + card.indicativeEmiRupees!) / income * 100)
      && within(card.applicableRoiPercent, c.minRoiPercent, c.maxRoiPercent)))
    && within(card.tentativeOfferRupees / customer.propertyValueRupees! * 100, c.minLtvPercent, c.maxLtvPercent)
    && (programme.canonicalProduct !== "HOME_LOAN_BT" ||
      (positive(card.transferComponentRupees) && card.transferComponentRupees <= customer.currentOutstandingRupees!));
}
