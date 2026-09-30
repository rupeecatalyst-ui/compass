import type { CanonicalLenderRecommendationRequest } from "@/types/canonical-lender-recommendation";
import type { FilterFactBag } from "./evaluate";

type Customer = CanonicalLenderRecommendationRequest["customer"];

function ageYearsFromCustomer(customer: Customer): number | undefined {
  if (typeof customer.ageYears === "number" && Number.isFinite(customer.ageYears) && customer.ageYears > 0) {
    return customer.ageYears;
  }
  return undefined;
}

/** Maps governed customer assessment fields onto canonical filter field IDs. Does not invent values. */
export function customerFactsForAdditionalFilters(customer: Customer, _asOf: Date): FilterFactBag {
  const ageYears = ageYearsFromCustomer(customer);
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
