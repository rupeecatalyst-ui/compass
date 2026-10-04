import type { CanonicalAssessmentProgramme } from "./programme-assessment-adapter";
import type {
  CanonicalAssessmentField,
  CanonicalLenderRecommendationRequest,
  EligibilityCriterionTrace,
} from "@/types/canonical-lender-recommendation";
import { applicantStateMatchesProgramme } from "@/lib/product-programme-operations/pan-india-geography";
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
  age: "age",
  cibil: "cibil",
  income: "monthlyIncome",
};

function mapFilterFieldsToAssessment(fieldIds: string[]): CanonicalAssessmentField[] {
  const mapped = fieldIds
    .map((id) => FILTER_FIELD_TO_ASSESSMENT[constraintKeyForField(id) ?? ""] ?? null)
    .filter((item): item is CanonicalAssessmentField => item != null);
  return mapped.length ? mapped : [];
}
export type GovernedVerdict = {
  reason: string;
  missingInputs: CanonicalAssessmentField[];
  criteria: EligibilityCriterionTrace[];
};
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const positive = (v: unknown): v is number => finite(v) && v > 0;
const nonnegative = (v: unknown): v is number => finite(v) && v >= 0;
const number = (v: string | number | null | undefined) => v == null ? null : Number(v);
const within = (value: number, min: string | number | null | undefined, max: string | number | null | undefined) =>
  (min == null || value >= Number(min)) && (max == null || value <= Number(max));
const rejected = (
  reason: string,
  missingInputs: CanonicalAssessmentField[] = [],
  criteria: EligibilityCriterionTrace[] = [],
): GovernedVerdict => ({ reason, missingInputs, criteria });

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

/** True when a published CIBIL bound cannot be decided from Not Known or a partial band. A band entirely outside the bound is a genuine mismatch, not a new question. */
export function programmeRequiresMorePreciseCibil(programme: CanonicalAssessmentProgramme, customer: Customer): boolean {
  const ranges = [{ minimum: programme.canonicalConstraints.minCibil, maximum: programme.canonicalConstraints.maxCibil }, ...programme.parsedPolicyRules.cibilRanges];
  const active = ranges.filter((range) => range.minimum != null || range.maximum != null);
  if (!active.length) return false;
  const interval = cibilInterval(customer.cibilBand);
  if (interval == null || interval === "unknown") return true;
  let anyInsideOrPartial = false;
  let partial = false;
  for (const range of active) {
    const outside = (range.minimum != null && interval[1] < range.minimum) || (range.maximum != null && interval[0] > range.maximum);
    if (outside) continue;
    anyInsideOrPartial = true;
    if (!within(interval[0], range.minimum, null) || !within(interval[1], null, range.maximum)) partial = true;
  }
  return anyInsideOrPartial && partial;
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
  const criteria: EligibilityCriterionTrace[] = [];
  let mismatch = false;
  function note(
    criterion: string,
    applicantValue: string | number | null,
    requirement: string | number | null,
    outcome: EligibilityCriterionTrace["outcome"],
    reasonCode: string,
  ) {
    criteria.push({ criterion, applicantValue, requirement, outcome, reasonCode });
  }
  function allowed(
    value: string | null | undefined,
    values: string[] | null | undefined,
    field: CanonicalAssessmentField,
    criterion: string = field,
  ) {
    if (!values?.length) return;
    const requirement = values.join("|");
    if (!value?.trim()) {
      missing.add(field);
      note(criterion, null, requirement, "INFORMATION_REQUIRED", `${criterion}_REQUIRED`);
    } else if (!values.includes(value)) {
      mismatch = true;
      note(criterion, value, requirement, "FAIL", `${criterion}_NOT_ELIGIBLE`);
    } else {
      note(criterion, value, requirement, "PASS", `${criterion}_ELIGIBLE`);
    }
  }
  allowed(customer.residency, c.residency, "residency");
  allowed(customer.employmentType, c.employmentTypes, "employment");
  allowed(customer.constitution, c.legalConstitutions, "constitution");
  allowed(customer.city, c.eligibleCities, "city");
  if (c.eligibleStates?.length) {
    const requirement = c.eligibleStates.join("|");
    if (!customer.state?.trim()) {
      missing.add("state");
      note("state", null, requirement, "INFORMATION_REQUIRED", "STATE_REQUIRED");
    } else if (applicantStateMatchesProgramme(customer.state, c.eligibleStates)) {
      note("state", customer.state, requirement, "PASS", "STATE_ELIGIBLE");
    } else {
      mismatch = true;
      note("state", customer.state, requirement, "FAIL", "STATE_NOT_ELIGIBLE");
    }
  }
  allowed(customer.propertyType, c.propertyCategories, "propertyType", "propertyCategory");
  allowed(customer.constructionStatus, c.constructionStatuses, "constructionStatus");
  allowed(customer.propertyKind, programme.allowedPropertyKinds, "propertyType");
  allowed(customer.constructionStatus, programme.allowedConstructionStatuses, "constructionStatus");
  allowed(customer.occupancy, programme.allowedOccupancy, "occupancy");
  allowed(customer.possessionStatus, programme.allowedPossession, "possession");
  allowed(customer.registrationStatus, programme.allowedRegistration, "registration");

  const interval = cibilInterval(customer.cibilBand);
  const ranges = [{ minimum: c.minCibil, maximum: c.maxCibil }, ...programme.parsedPolicyRules.cibilRanges];
  const cibilRequirement = ranges.map((range) => `${range.minimum ?? ""}-${range.maximum ?? ""}`).join("|");
  if (interval == null) {
    missing.add("cibil");
    note("cibil", null, cibilRequirement, "INFORMATION_REQUIRED", "CIBIL_REQUIRED");
  } else if (interval === "unknown") {
    if (ranges.some(r => r.minimum != null || r.maximum != null)) {
      missing.add("cibil");
      note("cibil", customer.cibilBand ?? null, cibilRequirement, "INFORMATION_REQUIRED", "CIBIL_MORE_PRECISE");
    }
  } else {
    let cibilOutside = false;
    let cibilPartial = false;
    for (const range of ranges) {
      if ((range.minimum != null && interval[1] < range.minimum) || (range.maximum != null && interval[0] > range.maximum)) cibilOutside = true;
      else if (!within(interval[0], range.minimum, null) || !within(interval[1], null, range.maximum)) cibilPartial = true;
    }
    if (cibilOutside) mismatch = true;
    if (cibilPartial) missing.add("cibil");
    note(
      "cibil",
      typeof customer.cibilBand === "number" ? customer.cibilBand : customer.cibilBand ?? null,
      cibilRequirement,
      cibilPartial ? "INFORMATION_REQUIRED" : cibilOutside ? "FAIL" : "PASS",
      cibilPartial ? "CIBIL_MORE_PRECISE" : cibilOutside ? "CIBIL_NOT_ELIGIBLE" : "CIBIL_ELIGIBLE",
    );
  }
  const permittedCategories = resolveHomeLoanCibilCategoryUniverse(customer.cibilBand).permittedCategories;
  const categoryPermitted = Boolean(programme.lenderCategory && permittedCategories.includes(programme.lenderCategory));
  note(
    "lenderCategory",
    programme.lenderCategory ?? null,
    permittedCategories.join("|"),
    categoryPermitted ? "PASS" : "FAIL",
    categoryPermitted ? "LENDER_CATEGORY_PERMITTED" : "LENDER_CATEGORY_NOT_PERMITTED",
  );
  if (!categoryPermitted) mismatch = true;

  const tenure = customer.customerSelectedTenureMonths;
  const tenureRequirement = `${c.minTenureMonths ?? ""}-${c.maxTenureMonths ?? ""}`;
  // Required for EMI/FOIR calculation even when no programme tenure bound is populated.
  if (!positive(tenure) || !Number.isInteger(tenure)) {
    missing.add("requestedTenure");
    note("tenure", tenure ?? null, tenureRequirement, "INFORMATION_REQUIRED", "TENURE_REQUIRED");
  } else if (!within(tenure, c.minTenureMonths, c.maxTenureMonths)) {
    mismatch = true;
    note("tenure", tenure, tenureRequirement, "FAIL", "TENURE_NOT_ELIGIBLE");
  } else {
    note("tenure", tenure, tenureRequirement, "PASS", "TENURE_ELIGIBLE");
  }
  // Opportunity age is authoritative. Contact date of birth is not a lending age.
  const ageMonths =
    customer.ageYears != null && Number.isFinite(customer.ageYears) && customer.ageYears > 0
      ? Math.round(customer.ageYears * 12)
      : null;
  if (c.minAge != null || c.maxAge != null || programme.maxAgeAtMaturityYears != null) {
    const ageRequirement = `${c.minAge ?? ""}-${c.maxAge ?? ""}`;
    if (ageMonths == null) {
      missing.add("age");
      note("age", null, ageRequirement, "INFORMATION_REQUIRED", "AGE_REQUIRED");
    } else if (!within(ageMonths, c.minAge == null ? null : c.minAge * 12, c.maxAge == null ? null : c.maxAge * 12)) {
      mismatch = true;
      note("age", customer.ageYears ?? null, ageRequirement, "FAIL", "AGE_NOT_ELIGIBLE");
    } else {
      note("age", customer.ageYears ?? null, ageRequirement, "PASS", "AGE_ELIGIBLE");
    }
  }
  const maturity = programme.maxAgeAtMaturityYears ?? null;
  if (maturity != null) {
    const party = programme.ageGoverningParty;
    if (party && party !== "applicant") missing.add("coApplicant");
    else if (ageMonths == null) missing.add("age");
    // Requested tenure above age-permitted tenure reduces EffectiveAvailableTenure.
    // It is not an automatic programme exclusion. Age months = completed years × 12.
  }

  if (customer.employmentFamily !== "salaried") {
    missing.add("employment");
    note("employment", customer.employmentFamily ?? null, "salaried", "INFORMATION_REQUIRED", "EMPLOYMENT_REQUIRED");
  }
  const incomeRequirement = `${c.minIncomeRupees ?? ""}-${c.maxIncomeRupees ?? ""}`;
  if (!positive(customer.monthlyIncomeRupees)) {
    missing.add("monthlyIncome");
    note("monthlyIncome", null, incomeRequirement, "INFORMATION_REQUIRED", "MONTHLY_INCOME_REQUIRED");
  } else if (!within(customer.monthlyIncomeRupees, c.minIncomeRupees, c.maxIncomeRupees)) {
    mismatch = true;
    note("monthlyIncome", customer.monthlyIncomeRupees, incomeRequirement, "FAIL", "MONTHLY_INCOME_NOT_ELIGIBLE");
  } else {
    note("monthlyIncome", customer.monthlyIncomeRupees, incomeRequirement, "PASS", "MONTHLY_INCOME_ELIGIBLE");
  }
  if (!nonnegative(customer.existingMonthlyEmiRupees)) {
    missing.add("obligations");
    note("obligations", null, null, "INFORMATION_REQUIRED", "OBLIGATIONS_REQUIRED");
  }
  if (!positive(customer.propertyValueRupees)) {
    missing.add("propertyValue");
    note("propertyValue", null, null, "INFORMATION_REQUIRED", "PROPERTY_VALUE_REQUIRED");
  }
  const amountRequirement = `${c.minLoanAmountRupees ?? ""}-${c.maxLoanAmountRupees ?? ""}`;
  if (!positive(customer.requiredAmountRupees)) {
    missing.add("requestedAmount");
    note("requestedAmount", null, amountRequirement, "INFORMATION_REQUIRED", "REQUESTED_AMOUNT_REQUIRED");
  } else if (!within(customer.requiredAmountRupees, c.minLoanAmountRupees, c.maxLoanAmountRupees)) {
    mismatch = true;
    note("requestedAmount", customer.requiredAmountRupees, amountRequirement, "FAIL", "REQUESTED_AMOUNT_NOT_ELIGIBLE");
  } else {
    note("requestedAmount", customer.requiredAmountRupees, amountRequirement, "PASS", "REQUESTED_AMOUNT_ELIGIBLE");
  }
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
  if (missing.size) return rejected("ASSESSMENT_INPUT_REQUIRED", [...missing], criteria);
  if (mismatch) return rejected("ELIGIBILITY_NOT_MET", [], criteria);
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
