import {
  OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS,
  OPPORTUNITY_ASSESSMENT_READINESS_COPY,
  OPPORTUNITY_ASSESSMENT_UNSUPPORTED_COPY,
} from "@/constants/opportunity-assessment-capture";
import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import type { AssessmentFact, OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentCaptureDto } from "@/types/opportunity-assessment-capture";
import { OpportunityAssessmentError, type OpportunityAssessmentErrorCode } from "./errors";
import { hashOpportunityAssessmentCommand } from "./content-hash";
import { deriveOpportunityAssessmentReadiness } from "./readiness";
import { OpportunityAssessmentService } from "./opportunity-assessment.service";
import {
  ASSESSMENT_NORMALIZED_INPUT_VERSION,
  type OpportunityAssessmentActorContext,
  type OpportunityAssessmentReadModel,
} from "./types";

export type OpportunityAssessmentHttpResult = {
  status: number;
  body: {
    success: boolean;
    data?: OpportunityAssessmentCaptureDto;
    error?: { code: string; message: string };
  };
};

export type { OpportunityAssessmentCaptureDto };

export type OpportunityAssessmentSaveBody = {
  kind: "SAVED" | "FINALIZED";
  expectedRowVersion: number;
  commandId: string;
  commandHash?: string;
  facts: OpportunityAssessmentFactsV1;
  sourceFingerprint?: OpportunityAssessmentReadModel["sourceFingerprint"];
  currentSourceFingerprint?: OpportunityAssessmentReadModel["sourceFingerprint"] | null;
  normalizedInput?: unknown;
  normalizedInputVersion?: string | null;
  organizationId?: unknown;
};

function collectMissingLabels(facts: OpportunityAssessmentFactsV1): string[] {
  const derived = deriveOpportunityAssessmentReadiness(facts);
  if (derived.readinessStatus !== "incomplete") return [];
  const required: Array<{ path: string; fact: AssessmentFact<unknown> }> = [
    { path: "borrower.residency", fact: facts.borrower.residency },
    { path: "borrower.employmentFamily", fact: facts.borrower.employmentFamily },
    { path: "borrower.dateOfBirth", fact: facts.borrower.dateOfBirth },
    { path: "incomeAndObligations.existingMonthlyObligations", fact: facts.incomeAndObligations.existingMonthlyObligations },
    { path: "incomeAndObligations.requestedTenureMonths", fact: facts.incomeAndObligations.requestedTenureMonths },
    { path: "loanRequirement.productCode", fact: facts.loanRequirement.productCode },
    { path: "loanRequirement.requestedAmount", fact: facts.loanRequirement.requestedAmount },
    { path: "property.propertyValue", fact: facts.property.propertyValue },
    { path: "property.propertyCategory", fact: facts.property.propertyCategory },
    { path: "property.constructionStatus", fact: facts.property.constructionStatus },
    { path: "property.propertyCity", fact: facts.property.propertyCity },
    { path: "cibil.kind", fact: facts.cibil.kind },
  ];
  if (facts.borrower.employmentFamily.value === "salaried") {
    required.push({ path: "incomeAndObligations.monthlyIncome", fact: facts.incomeAndObligations.monthlyIncome });
  }
  if (facts.loanRequirement.productCode.value === "HOME_LOAN_BT") {
    required.push({
      path: "balanceTransfer.outstandingPrincipal",
      fact: facts.balanceTransfer.outstandingPrincipal,
    });
  }
  return required
    .filter((item) => item.fact.state === "missing" || item.fact.state === "unconfirmed" || item.fact.value == null || item.fact.value === "missing")
    .map((item) => OPPORTUNITY_ASSESSMENT_CAPTURE_FIELD_LABELS[item.path] ?? item.path)
    .filter((label, index, all) => all.indexOf(label) === index);
}

export function projectOpportunityAssessmentCapture(
  read: OpportunityAssessmentReadModel,
  unsupportedReasonCode: string | null,
): OpportunityAssessmentCaptureDto {
  const unsupportedCopy =
    unsupportedReasonCode && OPPORTUNITY_ASSESSMENT_UNSUPPORTED_COPY[unsupportedReasonCode]
      ? OPPORTUNITY_ASSESSMENT_UNSUPPORTED_COPY[unsupportedReasonCode]
      : read.readinessStatus === "unsupported"
        ? OPPORTUNITY_ASSESSMENT_READINESS_COPY.unsupported
        : null;
  return {
    assessmentId: read.assessment.id,
    opportunityId: read.assessment.opportunityId,
    rowVersion: read.rowVersion,
    readinessStatus: read.readinessStatus,
    readinessCopy: OPPORTUNITY_ASSESSMENT_READINESS_COPY[read.readinessStatus],
    unsupportedCopy,
    stale: read.stale,
    staleReasons: read.staleReasons,
    currentRevisionKind: read.currentRevision?.revisionKind ?? null,
    currentRevisionNumber: read.currentRevisionNumber,
    facts: read.facts,
    sourceFingerprint: read.sourceFingerprint,
    missingLabels: collectMissingLabels(read.facts),
    recommendationExecuted: false,
    recommendationRunCreated: false,
  };
}

export function mapOpportunityAssessmentHttpError(error: unknown): OpportunityAssessmentHttpResult {
  if (error instanceof OpportunityAssessmentError) {
    const status = statusForAssessmentCode(error.code);
    return {
      status,
      body: { success: false, error: { code: error.code, message: error.code } },
    };
  }
  return {
    status: 500,
    body: {
      success: false,
      error: { code: "ASSESSMENT_PERSISTENCE_FAILURE", message: "ASSESSMENT_PERSISTENCE_FAILURE" },
    },
  };
}

function statusForAssessmentCode(code: OpportunityAssessmentErrorCode): number {
  switch (code) {
    case "ASSESSMENT_NOT_FOUND":
    case "REVISION_NOT_FOUND":
    case "RUN_NOT_FOUND":
      return 404;
    case "CROSS_ORGANIZATION_ACCESS":
      return 403;
    case "ASSESSMENT_CONFLICT":
    case "IDEMPOTENCY_CONFLICT":
    case "RUN_ALREADY_TERMINAL":
      return 409;
    case "ASSESSMENT_PERSISTENCE_FAILURE":
      return 503;
    default:
      return 422;
  }
}

async function readProjected(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  opportunityId: string,
  assessmentId: string,
  currentSourceFingerprint?: OpportunityAssessmentReadModel["sourceFingerprint"] | null,
) {
  const read = await service.readCurrentAssessment(actor, {
    assessmentId,
    opportunityId,
    currentSourceFingerprint,
  });
  return projectOpportunityAssessmentCapture(read, read.assessment.unsupportedReasonCode);
}

export async function getOpportunityAssessmentCapture(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  opportunityId: string,
  assessmentId?: string,
): Promise<OpportunityAssessmentHttpResult> {
  try {
    if (!opportunityId.trim()) {
      throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    }
    const id = assessmentId?.trim()
      ? assessmentId
      : (await service.getOrCreateAssessment(actor, opportunityId)).id;
    const data = await readProjected(service, actor, opportunityId, id);
    return { status: 200, body: { success: true, data } };
  } catch (error) {
    return mapOpportunityAssessmentHttpError(error);
  }
}

export async function saveOpportunityAssessmentCapture(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  opportunityId: string,
  body: OpportunityAssessmentSaveBody,
): Promise<OpportunityAssessmentHttpResult> {
  try {
    if (!opportunityId.trim()) throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    if (body.kind !== "SAVED" && body.kind !== "FINALIZED") {
      throw new OpportunityAssessmentError("INVALID_FINALIZATION");
    }
    if (!body.commandId?.trim()) throw new OpportunityAssessmentError("INVALID_ASSESSMENT_FACTS");
    const created = await service.getOrCreateAssessment(actor, opportunityId);
    const sourceFingerprint = body.sourceFingerprint ?? buildOpportunityAssessmentSourceFingerprint();
    const commandHash =
      body.commandHash?.trim() ||
      hashOpportunityAssessmentCommand({
        kind: body.kind,
        facts: body.facts,
        opportunityId,
        commandId: body.commandId,
      });
    const revision = await service.saveRevision(actor, {
      assessmentId: created.id,
      opportunityId,
      expectedRowVersion: body.expectedRowVersion,
      commandId: body.commandId,
      commandHash,
      facts: body.facts,
      sourceFingerprint,
      currentSourceFingerprint: body.currentSourceFingerprint ?? sourceFingerprint,
      kind: body.kind,
      normalizedInput:
        body.kind === "FINALIZED"
          ? (body.normalizedInput ?? {
              captureComplete: true,
              factsSchemaVersion: body.facts.schemaVersion,
            })
          : body.normalizedInput ?? null,
      normalizedInputVersion:
        body.kind === "FINALIZED"
          ? body.normalizedInputVersion ?? ASSESSMENT_NORMALIZED_INPUT_VERSION
          : body.normalizedInputVersion ?? null,
    });
    const data = await readProjected(service, actor, opportunityId, created.id, sourceFingerprint);
    if (revision.revisionKind === "FINALIZED" && data.currentRevisionKind !== "FINALIZED") {
      throw new OpportunityAssessmentError("INVALID_FINALIZATION");
    }
    return { status: 200, body: { success: true, data } };
  } catch (error) {
    return mapOpportunityAssessmentHttpError(error);
  }
}

export async function listOpportunityAssessmentRecommendationRuns(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  assessmentId: string,
) {
  return service.listRecommendationRuns(actor, assessmentId);
}
