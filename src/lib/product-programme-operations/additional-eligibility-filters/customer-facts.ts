import type { CanonicalLenderRecommendationRequest } from "@/types/canonical-lender-recommendation";
import type { FilterFactBag } from "./evaluate";

type Customer = CanonicalLenderRecommendationRequest["customer"];

function ageYearsFromCustomer(customer: Customer, asOf: Date): number | undefined {
  if (typeof customer.ageYears === "number" && Number.isFinite(customer.ageYears) && customer.ageYears > 0) {
    return customer.ageYears;
  }
  const dob = customer.dateOfBirth;
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return undefined;
  const date = new Date(`${dob}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return undefined;
  let years = asOf.getUTCFullYear() - date.getUTCFullYear();
  const monthDelta = asOf.getUTCMonth() - date.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getUTCDate() < date.getUTCDate())) years -= 1;
  return years > 0 ? years : undefined;
}

/** Maps governed customer assessment fields onto canonical filter field IDs. Does not invent values. */
export function customerFactsForAdditionalFilters(customer: Customer, asOf: Date): FilterFactBag {
  const ageYears = ageYearsFromCustomer(customer, asOf);
  const facts: Record<string, unknown> = {
    "assessment:property.constructionStatus": customer.constructionStatus,
    constructionStatus: customer.constructionStatus,
    "assessment:property.propertyCategory": customer.propertyType,
    propertyCategory: customer.propertyType,
    "assessment:property.propertyKind": customer.propertyKind,
    "assessment:borrower.employmentTypeCode": customer.employmentType,
    "assessment:borrower.employmentFamily": customer.employmentFamily,
    employment: customer.employmentType ?? customer.employmentFamily,
    "assessment:borrower.journeyCity": customer.city,
    city: customer.city,
    "assessment:borrower.journeyState": customer.state,
    state: customer.state,
    "assessment:borrower.residency": customer.residency,
    residency: customer.residency,
    "assessment:borrower.constitution": customer.constitution,
    "assessment:borrower.dateOfBirth": customer.dateOfBirth,
    "assessment:cibil.exactScore": typeof customer.cibilBand === "number" ? customer.cibilBand : undefined,
    "assessment:incomeAndObligations.monthlyIncome": customer.monthlyIncomeRupees,
    "assessment:loanRequirement.requestedAmount": customer.requiredAmountRupees,
    "assessment:property.propertyValue": customer.propertyValueRupees,
    "assessment:incomeAndObligations.requestedTenureMonths": customer.customerSelectedTenureMonths,
  };
  if (ageYears != null) {
    facts["assessment:borrower.ageYears"] = ageYears;
    facts["derived:ageYears"] = ageYears;
    facts.ageYears = ageYears;
    facts.age = ageYears;
  }
  return facts;
}
