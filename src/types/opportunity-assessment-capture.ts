import type {
  AssessmentReadinessStatus,
  OpportunityAssessmentFactsV1,
  OpportunityAssessmentSourceFingerprint,
} from "@/types/opportunity-assessment";

export type OpportunityAssessmentCaptureDto = {
  assessmentId: string;
  opportunityId: string;
  rowVersion: number;
  readinessStatus: AssessmentReadinessStatus;
  readinessCopy: string;
  unsupportedCopy: string | null;
  stale: boolean;
  staleReasons: string[];
  currentRevisionKind: "SAVED" | "FINALIZED" | null;
  currentRevisionNumber: number;
  facts: OpportunityAssessmentFactsV1;
  sourceFingerprint: OpportunityAssessmentSourceFingerprint;
  missingLabels: string[];
  journeyFields?: import("@/types/product-journey-definition").ProductJourneyFieldRow[];
  recommendationExecuted: false;
  recommendationRunCreated: false;
};
