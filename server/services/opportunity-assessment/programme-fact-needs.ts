import type { CanonicalAssessmentProgramme } from "@server/services/lender-recommendation/programme-assessment-adapter";
import { programmeRequiresMorePreciseCibil } from "@server/services/lender-recommendation/canonical-governed-eligibility";
import type { ChanakyaUnsupportedFactBlocker } from "@/types/chanakya-recommendation-workspace";
import type { CanonicalLenderRecommendationRequest } from "@/types/canonical-lender-recommendation";
import type { AdditionalEligibilityFilters, AdditionalFilterNode } from "@/lib/product-programme-operations/additional-eligibility-filters";

type Customer = CanonicalLenderRecommendationRequest["customer"];

const ASK_BY_FILTER: Record<string, string> = {
  age: "borrower.ageYears",
  ageyears: "borrower.ageYears",
  dateofbirth: "borrower.ageYears",
  residency: "borrower.residency",
  constitution: "borrower.constitution",
  propertycategory: "property.propertyCategory",
  constructionstatus: "property.constructionStatus",
  city: "property.propertyCity",
  state: "property.propertyState",
  cibil: "cibil.kind",
  employment: "borrower.employmentFamily",
  monthlyincome: "incomeAndObligations.monthlyIncome",
  obligations: "incomeAndObligations.existingMonthlyObligations",
  propertyvalue: "property.propertyValue",
  requestedamount: "loanRequirement.requestedAmount",
  requestedtenure: "incomeAndObligations.requestedTenureMonths",
  loanstartdate: "balanceTransfer.loanStartDate",
  repaymenttrack: "balanceTransfer.repaymentTrack",
  delayedemis: "balanceTransfer.delayedEmiCount",
};

const UNSUPPORTED_BY_FILTER: Record<string, string> = {
  propertykind: "property.propertyKind",
  occupancy: "property.occupancy",
  possession: "property.possessionStatus",
  registration: "property.registrationStatus",
  coapplicant: "coApplicant",
};

const UNSUPPORTED_LABELS: Record<string, string> = {
  "property.propertyKind": "Property Kind",
  "property.occupancy": "Occupancy",
  "property.possessionStatus": "Possession Status",
  "property.registrationStatus": "Registration Status",
  coApplicant: "Co-applicant",
};

function filterLeaf(fieldId: string): string {
  const tail = fieldId.split(".").pop() ?? fieldId;
  return tail.split(":").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() ?? "";
}

function text(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function agePresent(customer: Customer): boolean {
  return customer.ageYears != null && Number.isInteger(customer.ageYears) && customer.ageYears >= 1 && customer.ageYears <= 120;
}

function factSatisfied(path: string, customer: Customer): boolean {
  if (path === "borrower.ageYears") return agePresent(customer);
  if (path === "borrower.constitution") return text(customer.constitution);
  if (path === "borrower.residency") return text(customer.residency);
  if (path === "borrower.employmentFamily") return text(customer.employmentType) || customer.employmentFamily === "salaried";
  if (path === "property.propertyCategory") return text(customer.propertyType);
  if (path === "property.constructionStatus") return text(customer.constructionStatus);
  if (path === "property.propertyCity") return text(customer.city);
  if (path === "property.propertyState") return text(customer.state);
  if (path === "cibil.kind") return customer.cibilBand != null && String(customer.cibilBand).trim() !== "" && String(customer.cibilBand) !== "not_known";
  if (path === "balanceTransfer.loanStartDate") return text(customer.loanStartDate) && customer.loanStartDateCertainty === "exact";
  if (path === "balanceTransfer.repaymentTrack") return Boolean(customer.repaymentTrack && customer.repaymentTrack !== "not_sure");
  if (path === "balanceTransfer.delayedEmiCount") {
    return typeof customer.delayedEmiCount === "number" && Number.isInteger(customer.delayedEmiCount) && customer.delayedEmiCount >= 0;
  }
  if (path === "incomeAndObligations.monthlyIncome") return typeof customer.monthlyIncomeRupees === "number" && customer.monthlyIncomeRupees > 0;
  if (path === "incomeAndObligations.existingMonthlyObligations") return typeof customer.existingMonthlyEmiRupees === "number" && customer.existingMonthlyEmiRupees >= 0;
  if (path === "property.propertyValue") return typeof customer.propertyValueRupees === "number" && customer.propertyValueRupees > 0;
  if (path === "loanRequirement.requestedAmount") return typeof customer.requiredAmountRupees === "number" && customer.requiredAmountRupees > 0;
  if (path === "incomeAndObligations.requestedTenureMonths") {
    return typeof customer.customerSelectedTenureMonths === "number" && customer.customerSelectedTenureMonths > 0;
  }
  return false;
}

function filterIds(filters: AdditionalEligibilityFilters | null | undefined): string[] {
  if (!filters?.root) return [];
  const ids: string[] = [];
  const walk = (node: AdditionalFilterNode) => {
    if (node.kind === "predicate") ids.push(node.fieldId);
    else node.children.forEach(walk);
  };
  walk(filters.root);
  return ids;
}

function programmeIdentity(programme: CanonicalAssessmentProgramme): { code: string; name: string } | null {
  const row = programme as CanonicalAssessmentProgramme & { code?: unknown; label?: unknown };
  const code = typeof row.code === "string" ? row.code.trim() : "";
  const name = typeof row.label === "string" ? row.label.trim() : "";
  if (!code && !name) return null;
  return { code, name };
}

export type ProgrammeFactNeeds = {
  askPaths: string[];
  unsupportedKeys: string[];
  blockers: ChanakyaUnsupportedFactBlocker[];
};

/** Facts required by viable programmes only. Savings-only BT comparison fields are not included. */
export function collectProgrammeFactNeeds(
  programmes: readonly CanonicalAssessmentProgramme[],
  customer: Customer,
): ProgrammeFactNeeds {
  const ask = new Set<string>();
  const unsupported = new Set<string>();
  const owners = new Map<string, Array<{ code: string; name: string }>>();

  const block = (key: string, programme: CanonicalAssessmentProgramme) => {
    unsupported.add(key);
    const identity = programmeIdentity(programme);
    const list = owners.get(key) ?? [];
    if (identity && !list.some((item) => item.code === identity.code && item.name === identity.name)) {
      list.push(identity);
    }
    owners.set(key, list);
  };

  for (const programme of programmes) {
    const constraints = programme.canonicalConstraints;
    if ((constraints.minAge != null || constraints.maxAge != null || programme.maxAgeAtMaturityYears != null) && !agePresent(customer)) {
      ask.add("borrower.ageYears");
    }
    if (constraints.residency?.length && !text(customer.residency)) ask.add("borrower.residency");
    if (constraints.employmentTypes?.length && !text(customer.employmentType)) ask.add("borrower.employmentFamily");
    if (constraints.propertyCategories?.length && !text(customer.propertyType)) ask.add("property.propertyCategory");
    if ((constraints.constructionStatuses?.length || programme.allowedConstructionStatuses?.length) && !text(customer.constructionStatus)) {
      ask.add("property.constructionStatus");
    }
    if (constraints.eligibleCities?.length && !text(customer.city)) ask.add("property.propertyCity");
    if (constraints.eligibleStates?.length && !text(customer.state)) ask.add("property.propertyState");
    if (programmeRequiresMorePreciseCibil(programme, customer)) ask.add("cibil.kind");
    if (constraints.legalConstitutions?.length && !text(customer.constitution)) ask.add("borrower.constitution");
    if (programme.allowedPropertyKinds?.length) block("property.propertyKind", programme);
    if (programme.allowedOccupancy?.length) block("property.occupancy", programme);
    if (programme.allowedPossession?.length) block("property.possessionStatus", programme);
    if (programme.allowedRegistration?.length) block("property.registrationStatus", programme);
    if (programme.ageGoverningParty && programme.ageGoverningParty !== "applicant") block("coApplicant", programme);
    if (programme.canonicalProduct === "HOME_LOAN_BT") {
      if (programme.requiredSeasoningMonths != null && !factSatisfied("balanceTransfer.loanStartDate", customer)) {
        ask.add("balanceTransfer.loanStartDate");
      }
      if (programme.repaymentCleanRequired === true && !factSatisfied("balanceTransfer.repaymentTrack", customer)) {
        ask.add("balanceTransfer.repaymentTrack");
      }
      if (programme.maxDelayedEmis != null && !factSatisfied("balanceTransfer.delayedEmiCount", customer)) {
        ask.add("balanceTransfer.delayedEmiCount");
      }
    }
    for (const fieldId of filterIds(programme.additionalEligibilityFilters)) {
      const leaf = filterLeaf(fieldId);
      const blocked = UNSUPPORTED_BY_FILTER[leaf];
      if (blocked) {
        block(blocked, programme);
        continue;
      }
      const path = ASK_BY_FILTER[leaf];
      if (!path) {
        block(fieldId, programme);
        continue;
      }
      if (path === "cibil.kind") {
        if (!factSatisfied(path, customer) || programmeRequiresMorePreciseCibil(programme, customer)) ask.add(path);
        continue;
      }
      if (!factSatisfied(path, customer)) ask.add(path);
    }
  }

  const blockers = [...unsupported].map((factKey) => {
    const contributed = owners.get(factKey) ?? [];
    return {
      factKey,
      displayLabel: UNSUPPORTED_LABELS[factKey] ?? factKey,
      reasonCategory: "CANONICAL_STORAGE_NOT_AVAILABLE" as const,
      ...(contributed.length === 1 ? { programmes: contributed } : {}),
    };
  });

  return { askPaths: [...ask], unsupportedKeys: [...unsupported], blockers };
}
