/**
 * Monthly income is absolute rupees from Lead Information through the assessment snapshot.
 * Requested amount keeps its existing lakh/crore financial-input conversion.
 */
import assert from "node:assert/strict";
import { emptyLeadInformationForm } from "@/constants/lead-information-workspace";
import { unitMagnitudeToAbsolute } from "@/lib/enterprise-financial-input";
import { formFromOpportunity, buildLeadInformationPatchBody } from "@/lib/lead-information/form-helpers";
import {
  canonicalFactsForLeadInformation,
  parseCanonicalRecommendationFactBody,
} from "@/lib/lead-information/canonical-recommendation-facts";
import { buildCanonicalAssessmentSnapshot } from "@server/services/opportunity-assessment/canonical-snapshot";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";

const INCOMES = [200_000, 250_000, 750_000, 1_000_000] as const;

function form(income: number) {
  return {
    ...emptyLeadInformationForm(),
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requestedAmount: "10000000",
    transactionType: "fresh",
    lendingType: "secured",
    businessSource: "direct",
    employmentTypeCode: "salaried",
    approxCibilScore: "750_799",
    cityLabel: "mumbai",
    stateLabel: "MH",
    borrowerAgeYears: "35",
    borrowerLegalConstitution: "individual",
    requestedTenureMonths: "240",
    monthlyIncomeRupees: String(income),
    existingMonthlyObligationsRupees: "15000",
    propertyValueRupees: "15000000",
    propertyCategory: "residential",
    constructionStatus: "ready",
    residency: "resident",
  };
}

export function runMonthlyIncomeUnitProof() {
  assert.equal(
    unitMagnitudeToAbsolute(250_000, "thousand"),
    250_000_000,
    "Thousand-unit magnitude 250000 is the 1000x defect",
  );

  for (const income of INCOMES) {
    const captured = canonicalFactsForLeadInformation(form(income));
    assert.equal(captured.ok, true, `capture ${income}`);
    if (!captured.ok) continue;
    assert.equal(captured.facts.monthlyIncomeRupees, income);

    const patched = buildLeadInformationPatchBody(form(income), 4);
    assert.equal(patched.monthlyIncomeRupees, income);
    assert.equal(patched.requestedAmount, 10_000_000);

    const server = parseCanonicalRecommendationFactBody(
      { monthlyIncomeRupees: income },
      "salaried",
    );
    assert.equal(server.ok, true);
    if (server.ok) assert.equal(server.patch.monthlyIncomeRupees, income);

    const reopened = formFromOpportunity({
      productCode: "HOME_LOAN",
      requestedAmount: 10_000_000,
      monthlyIncomeRupees: income,
      employmentTypeCode: "salaried",
      lendingExtension: null,
    } as EnterpriseOpportunityApiRecord);
    assert.equal(reopened.monthlyIncomeRupees, String(income));
    assert.equal(reopened.requestedAmount, "10000000");

    const snapshot = buildCanonicalAssessmentSnapshot({
      opportunityId: "opp-income",
      productCode: "HOME_LOAN",
      employmentTypeCode: "salaried",
      requestedAmount: 10_000_000,
      monthlyIncomeRupees: income,
    });
    assert.equal(snapshot.loanRequirement.requestedAmount.value, "10000000.00");
    assert.equal(snapshot.incomeAndObligations.monthlyIncome.value, `${income}.00`);
    assert.equal(snapshot.incomeAndObligations.monthlyIncome.state, "known");
  }

  assert.equal(unitMagnitudeToAbsolute(1, "crore"), 10_000_000);
  assert.equal(unitMagnitudeToAbsolute(100, "lakh"), 10_000_000);
}
