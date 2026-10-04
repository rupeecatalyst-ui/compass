import {
  OPPORTUNITY_ASSESSMENT_READINESS_COPY,
  OPPORTUNITY_ASSESSMENT_UNSUPPORTED_COPY,
} from "@/constants/opportunity-assessment-capture";
import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import {
  applyMissingOnlyOpportunityReuse,
  type AssessmentReuseSources,
} from "@/lib/opportunity-assessment/reuse-opportunity-facts";
import type { OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import type { OpportunityAssessmentCaptureDto } from "@/types/opportunity-assessment-capture";
import type { ProductJourneyFieldRow } from "@/types/product-journey-definition";
import { OpportunityAssessmentError, type OpportunityAssessmentErrorCode } from "./errors";
import { hashOpportunityAssessmentCommand } from "./content-hash";
import { collectOpportunityAssessmentMissingLabels } from "./missing-labels";
import { deriveOpportunityAssessmentReadiness, resolveJourneyFieldsForFacts } from "./readiness";
import { OpportunityAssessmentService } from "./opportunity-assessment.service";
import {
  ASSESSMENT_NORMALIZED_INPUT_VERSION,
  type OpportunityAssessmentActorContext,
  type OpportunityAssessmentReadModel,
} from "./types";

export type JourneyFieldsResolver = (
  facts: OpportunityAssessmentFactsV1,
) => Promise<readonly ProductJourneyFieldRow[] | null | undefined> | readonly ProductJourneyFieldRow[] | null | undefined;

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

export function overlayOpportunityAssessmentFacts(
  read: OpportunityAssessmentReadModel,
  sources?: AssessmentReuseSources | null,
  journeyFields?: readonly ProductJourneyFieldRow[] | null,
) {
  const revisionKind = read.currentRevision?.revisionKind ?? null;
  const facts = applyMissingOnlyOpportunityReuse(read.facts, sources ?? null, { revisionKind });
  const derived = deriveOpportunityAssessmentReadiness(facts, journeyFields);
  const readinessStatus = revisionKind === "FINALIZED" ? read.readinessStatus : derived.readinessStatus;
  const unsupportedReasonCode =
    revisionKind === "FINALIZED" ? read.assessment.unsupportedReasonCode : derived.unsupportedReasonCode;
  return { facts, readinessStatus, unsupportedReasonCode, revisionKind };
}

export function projectOpportunityAssessmentCapture(
  read: OpportunityAssessmentReadModel,
  unsupportedReasonCode: string | null,
  sources?: AssessmentReuseSources | null,
  journeyFields?: readonly ProductJourneyFieldRow[] | null,
): OpportunityAssessmentCaptureDto {
  const overlaid = overlayOpportunityAssessmentFacts(read, sources, journeyFields);
  const displayUnsupported = overlaid.unsupportedReasonCode ?? unsupportedReasonCode;
  const unsupportedCopy =
    displayUnsupported && OPPORTUNITY_ASSESSMENT_UNSUPPORTED_COPY[displayUnsupported]
      ? OPPORTUNITY_ASSESSMENT_UNSUPPORTED_COPY[displayUnsupported]
      : overlaid.readinessStatus === "unsupported"
        ? OPPORTUNITY_ASSESSMENT_READINESS_COPY.unsupported
        : null;
  const effectiveJourney = resolveJourneyFieldsForFacts(overlaid.facts, journeyFields);
  return {
    assessmentId: read.assessment.id,
    opportunityId: read.assessment.opportunityId,
    rowVersion: read.rowVersion,
    readinessStatus: overlaid.readinessStatus,
    readinessCopy: OPPORTUNITY_ASSESSMENT_READINESS_COPY[overlaid.readinessStatus],
    unsupportedCopy,
    stale: read.stale,
    staleReasons: read.staleReasons,
    currentRevisionKind: overlaid.revisionKind,
    currentRevisionNumber: read.currentRevisionNumber,
    facts: overlaid.facts,
    sourceFingerprint: read.sourceFingerprint,
    missingLabels: collectOpportunityAssessmentMissingLabels(overlaid.facts, effectiveJourney),
    journeyFields: effectiveJourney,
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
  sources?: AssessmentReuseSources | null,
  resolveJourney?: JourneyFieldsResolver,
) {
  const read = await service.readCurrentAssessment(actor, {
    assessmentId,
    opportunityId,
    currentSourceFingerprint,
  });
  const overlaidFacts = overlayOpportunityAssessmentFacts(read, sources).facts;
  const journeyFields = resolveJourney ? await resolveJourney(overlaidFacts) : undefined;
  return projectOpportunityAssessmentCapture(read, read.assessment.unsupportedReasonCode, sources, journeyFields);
}

export async function getOpportunityAssessmentCapture(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  opportunityId: string,
  assessmentId?: string,
  sources?: AssessmentReuseSources | null,
  resolveJourney?: JourneyFieldsResolver,
): Promise<OpportunityAssessmentHttpResult> {
  try {
    if (!opportunityId.trim()) {
      throw new OpportunityAssessmentError("ASSESSMENT_NOT_FOUND");
    }
    const id = assessmentId?.trim()
      ? assessmentId
      : (await service.getOrCreateAssessment(actor, opportunityId)).id;
    const data = await readProjected(service, actor, opportunityId, id, null, sources, resolveJourney);
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
  resolveJourney?: JourneyFieldsResolver,
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
    const journeyFields = resolveJourney ? await resolveJourney(body.facts) : undefined;
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
      journeyFields,
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
    const data = await readProjected(service, actor, opportunityId, created.id, sourceFingerprint, undefined, resolveJourney);
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
