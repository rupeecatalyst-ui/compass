export const OPPORTUNITY_ASSESSMENT_ERROR_CODES = [
  "ASSESSMENT_NOT_FOUND",
  "ASSESSMENT_CONFLICT",
  "REVISION_NOT_FOUND",
  "IDEMPOTENCY_CONFLICT",
  "INVALID_ASSESSMENT_FACTS",
  "INVALID_PROVENANCE",
  "ASSESSMENT_INCOMPLETE",
  "ASSESSMENT_CONFLICTING",
  "ASSESSMENT_UNCONFIRMED",
  "ASSESSMENT_UNSUPPORTED",
  "ASSESSMENT_STALE",
  "INVALID_FINALIZATION",
  "RUN_NOT_FOUND",
  "RUN_ALREADY_TERMINAL",
  "CROSS_ORGANIZATION_ACCESS",
  "ASSESSMENT_PERSISTENCE_FAILURE",
] as const;

export type OpportunityAssessmentErrorCode = (typeof OPPORTUNITY_ASSESSMENT_ERROR_CODES)[number];

export class OpportunityAssessmentError extends Error {
  readonly code: OpportunityAssessmentErrorCode;

  constructor(code: OpportunityAssessmentErrorCode, message?: string) {
    super(message ?? code);
    this.name = "OpportunityAssessmentError";
    this.code = code;
  }
}

export function isOpportunityAssessmentError(error: unknown): error is OpportunityAssessmentError {
  return error instanceof OpportunityAssessmentError;
}

export function assessmentErrorCode(error: unknown): OpportunityAssessmentErrorCode | "ASSESSMENT_CONFLICT" {
  if (error instanceof OpportunityAssessmentError) return error.code;
  return "ASSESSMENT_CONFLICT";
}
