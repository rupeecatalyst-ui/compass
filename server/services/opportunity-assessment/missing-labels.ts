import {
  OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS,
} from "@/constants/opportunity-assessment-capture";
import type { OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { deriveOpportunityAssessmentReadiness, resolveJourneyFieldsForFacts } from "./readiness";
import { mandatoryRecommendationFields } from "@/lib/product-journey/applicability";
import { missingJourneyFieldLabels } from "@/lib/product-journey/readiness-fields";

export function collectOpportunityAssessmentMissingLabels(
  facts: OpportunityAssessmentFactsV1,
  journeyFields?: readonly ProductJourneyFieldRow[] | null,
): string[] {
  const rows = resolveJourneyFieldsForFacts(facts, journeyFields);
  const derived = deriveOpportunityAssessmentReadiness(facts, rows);
  if (derived.readinessStatus !== "incomplete") return [];
  const labels = missingJourneyFieldLabels(
    facts,
    mandatoryRecommendationFields(rows, facts.borrower.employmentFamily.value ?? "unknown"),
  );
  if (labels.length > 0) return labels;
  return Object.values(OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS).slice(0, 0);
}
