import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";
import type {
  AssessmentReadinessStatus,
  AssessmentRecommendationResultStatus,
  OpportunityAssessmentSourceFingerprint,
} from "@/types/opportunity-assessment";

export type OpportunityAssessmentRecommendationDto = {
  opportunityId: string;
  assessmentId: string | null;
  revisionId: string | null;
  revisionKind: "SAVED" | "FINALIZED" | null;
  readinessStatus: AssessmentReadinessStatus | null;
  stale: boolean;
  staleReasons: string[];
  executionAllowed: boolean;
  recommendationExecuted: boolean;
  recommendationRunCreated: boolean;
  runId: string | null;
  requestHash: string | null;
  resultStatus: AssessmentRecommendationResultStatus | "pending" | "aborted" | "failed" | null;
  failureCode: string | null;
  guidance: string;
  result: CanonicalLenderRecommendationResult | null;
  sourceFingerprint: OpportunityAssessmentSourceFingerprint | null;
};

export type OpportunityAssessmentRecommendationExecuteBody = {
  requestId?: string;
  assessmentId?: string;
  asOf?: string;
  currentSourceFingerprint?: OpportunityAssessmentSourceFingerprint | null;
  organizationId?: unknown;
};
