export {
  OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
  OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
} from "@/types/opportunity-assessment";
export { emptyOpportunityAssessmentFacts, missingAssessmentFact } from "@/lib/opportunity-assessment/empty-facts";
export {
  buildOpportunityAssessmentSourceFingerprint,
  opportunityAssessmentSourceFingerprintSchema,
  opportunityAssessmentSourceFingerprintsEqual,
  serializeOpportunityAssessmentSourceFingerprint,
} from "@/lib/opportunity-assessment/fingerprint";
export {
  cloneAssessmentFact,
  opportunityAssessmentFactsSchema,
  parseOpportunityAssessmentFacts,
  safeParseOpportunityAssessmentFacts,
} from "@/lib/opportunity-assessment/facts-schema";
