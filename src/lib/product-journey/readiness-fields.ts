import { isEmploymentClassificationAsPropertyCategory } from "@/constants/product-journey/property-category";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS } from "@/constants/opportunity-assessment-capture";
import { resolveProductJourneyFieldLabel } from "@/lib/product-journey/display-label";

function factAtPath(facts: OpportunityAssessmentFactsV1, path: string): AssessmentFact<unknown> | null {
  const [section, key] = path.split(".");
  if (!section || !key) return null;
  const bucket = (facts as Record<string, unknown>)[section];
  if (!bucket || typeof bucket !== "object") return null;
  const fact = (bucket as Record<string, unknown>)[key];
  if (!fact || typeof fact !== "object" || !("state" in fact)) return null;
  return fact as AssessmentFact<unknown>;
}

export function assessmentPathForJourneyField(fieldId: string): string | null {
  if (fieldId.startsWith("assessment:")) return fieldId.slice("assessment:".length);
  const idc = fieldId.startsWith("idc:") ? fieldId.slice(4) : fieldId;
  const map: Record<string, string> = {
    ageYears: "borrower.ageYears",
    employmentTypeCode: "borrower.employmentFamily",
    monthlyIncome: "incomeAndObligations.monthlyIncome",
    monthlyIncomeLabel: "incomeAndObligations.monthlyIncome",
    loanAmount: "loanRequirement.requestedAmount",
    requestedAmountLabel: "loanRequirement.requestedAmount",
    propertyValueLabel: "property.propertyValue",
    approxCibilScore: "cibil.kind",
    city: "borrower.journeyCity",
    propertyType: "property.constructionStatus",
    propertyValue: "property.propertyValue",
  };
  return map[idc] ?? null;
}

export function journeyFieldIsSatisfied(facts: OpportunityAssessmentFactsV1, row: ProductJourneyFieldRow): boolean {
  if (row.fieldId.startsWith("derived:")) return false;
  const path = assessmentPathForJourneyField(row.fieldId);
  if (!path) return false;
  const fact = factAtPath(facts, path);
  if (!fact) return false;
  if (path === "property.propertyCategory" && isEmploymentClassificationAsPropertyCategory(String(fact.value ?? ""))) {
    return false;
  }
  if (path === "cibil.kind") {
    return fact.state !== "missing" && fact.value != null && fact.value !== "missing";
  }
  if (fact.state === "explicitly_unknown") return true;
  if (fact.knownZeroDeclared === true) return true;
  return fact.state === "known" && fact.value != null;
}

export function missingJourneyFieldLabels(
  facts: OpportunityAssessmentFactsV1,
  rows: readonly ProductJourneyFieldRow[],
): string[] {
  return rows
    .filter((row) => row.mandatoryForRecommendation && !journeyFieldIsSatisfied(facts, row))
    .map((row) => {
      const path = assessmentPathForJourneyField(row.fieldId);
      return (
        resolveProductJourneyFieldLabel(row.fieldId, row.label) ||
        (path ? OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS[path] : null) ||
        row.fieldId
      );
    })
    .filter((label, index, all) => all.indexOf(label) === index);
}

export function assessmentPathIsConfigured(
  path: string,
  rows: readonly ProductJourneyFieldRow[],
  mode: "capture" | "any" = "capture",
): boolean {
  return rows.some((row) => {
    if (mode === "capture" && !row.capture && !row.mandatoryForRecommendation) return false;
    return assessmentPathForJourneyField(row.fieldId) === path;
  });
}
