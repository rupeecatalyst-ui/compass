import {
  OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
  OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
} from "@/types/opportunity-assessment";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";
import type { CanonicalRecommendationDependencies } from "@server/services/lender-recommendation/canonical-lender-recommendation.service";
import { recommendLendersCanonical } from "@server/services/lender-recommendation/canonical-lender-recommendation.service";
import {
  OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY,
} from "@/constants/opportunity-assessment-recommendation";
import type { OpportunityAssessmentRecommendationDto } from "@/types/opportunity-assessment-recommendation";
import { hashOpportunityAssessmentCommand } from "./content-hash";
import { OpportunityAssessmentError } from "./errors";
import { mapFinalizedAssessmentFactsToCanonical } from "./map-to-canonical";
import { OpportunityAssessmentService, TERMINAL_RUN_STATUSES } from "./opportunity-assessment.service";
import type {
  AssessmentRunResultStatus,
  OpportunityAssessmentActorContext,
  OpportunityAssessmentReadModel,
  OpportunityAssessmentRecommendationRunRecord,
  OpportunityAssessmentRevisionRecord,
  SaveAssessmentRevisionInput,
} from "./types";

export type ExecuteFinalizedAssessmentRecommendationInput = {
  opportunityId: string;
  assessmentId?: string;
  requestId?: string;
  asOf?: Date | string;
  currentSourceFingerprint?: SaveAssessmentRevisionInput["sourceFingerprint"] | null;
  persist?: boolean;
};

export type ExecuteFinalizedAssessmentRecommendationDependencies = CanonicalRecommendationDependencies & {
  recommend?: typeof recommendLendersCanonical;
  now?: () => Date;
  nextRequestId?: () => string;
};

function guidanceFor(code: string | null, status: AssessmentRunResultStatus | null): string {
  if (code && code in OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY) {
    return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY[code as keyof typeof OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY];
  }
  if (status === "ready") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.READY;
  if (status === "no_eligible_programmes") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.NO_ELIGIBLE_PROGRAMMES;
  if (status === "configuration_error") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.CONFIGURATION_ERROR;
  if (status === "failed") return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.RUN_FAILED;
  return OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY.ASSESSMENT_REVISION_REQUIRED;
}

function gateCode(read: OpportunityAssessmentReadModel): string | null {
  if (!read.currentRevision) return "ASSESSMENT_REVISION_REQUIRED";
  if (read.stale) return "ASSESSMENT_STALE";
  if (read.readinessStatus === "incomplete") return "ASSESSMENT_INCOMPLETE";
  if (read.readinessStatus === "conflicted") return "ASSESSMENT_CONFLICTING";
  if (read.readinessStatus === "unsupported") return "ASSESSMENT_UNSUPPORTED";
  if (read.readinessStatus === "stale") return "ASSESSMENT_STALE";
  if (read.currentRevision.revisionKind !== "FINALIZED") return "ASSESSMENT_NOT_FINALIZED";
  if (read.readinessStatus !== "ready") return "ASSESSMENT_INCOMPLETE";
  return null;
}

function sanitizeResult(result: CanonicalLenderRecommendationResult): CanonicalLenderRecommendationResult {
  return {
    ...result,
    recommendations: result.recommendations.map((card) => {
      const rest = { ...card, lenderScore: null as null };
      delete (rest as { stars?: unknown }).stars;
      delete (rest as { confidence?: unknown }).confidence;
      return rest;
    }),
    versions: { ...result.versions, lenderScoreVersion: null },
  };
}

function requestHashFor(input: {
  organizationId: string;
  opportunityId: string;
  revision: OpportunityAssessmentRevisionRecord;
  product: string;
  customer: unknown;
  asOf: string;
}) {
  return hashOpportunityAssessmentCommand({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    revisionId: input.revision.id,
    contentHash: input.revision.contentHash,
    mapperVersion: OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
    factsSchemaVersion: OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
    product: input.product,
    customer: input.customer,
    asOf: input.asOf,
  });
}

function emptyDto(opportunityId: string, failureCode: string | null, extra: Partial<OpportunityAssessmentRecommendationDto> = {}): OpportunityAssessmentRecommendationDto {
  return {
    opportunityId,
    assessmentId: extra.assessmentId ?? null,
    revisionId: extra.revisionId ?? null,
    revisionKind: extra.revisionKind ?? null,
    readinessStatus: extra.readinessStatus ?? null,
    stale: extra.stale ?? false,
    staleReasons: extra.staleReasons ?? [],
    executionAllowed: extra.executionAllowed ?? false,
    recommendationExecuted: extra.recommendationExecuted ?? false,
    recommendationRunCreated: extra.recommendationRunCreated ?? false,
    runId: extra.runId ?? null,
    requestHash: extra.requestHash ?? null,
    resultStatus: extra.resultStatus ?? null,
    failureCode,
    guidance: extra.guidance ?? guidanceFor(failureCode, extra.resultStatus ?? null),
    result: extra.result ?? null,
    sourceFingerprint: extra.sourceFingerprint ?? null,
  };
}

function dtoFromRead(
  opportunityId: string,
  read: OpportunityAssessmentReadModel,
  extra: Partial<OpportunityAssessmentRecommendationDto> = {},
): OpportunityAssessmentRecommendationDto {
  const blocked = gateCode(read);
  return emptyDto(opportunityId, extra.failureCode ?? blocked, {
    assessmentId: read.assessment.id,
    revisionId: read.currentRevision?.id ?? null,
    revisionKind: read.currentRevision?.revisionKind ?? null,
    readinessStatus: read.readinessStatus,
    stale: read.stale,
    staleReasons: read.staleReasons,
    executionAllowed: blocked == null,
    sourceFingerprint: read.sourceFingerprint,
    ...extra,
    guidance: extra.guidance ?? guidanceFor(extra.failureCode ?? blocked, extra.resultStatus ?? null),
  });
}

async function loadAssessment(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  input: ExecuteFinalizedAssessmentRecommendationInput,
) {
  const created = input.assessmentId
    ? { id: input.assessmentId }
    : await service.getOrCreateAssessment(actor, input.opportunityId);
  const read = await service.readCurrentAssessment(actor, {
    assessmentId: created.id,
    opportunityId: input.opportunityId,
    currentSourceFingerprint: input.currentSourceFingerprint ?? null,
  });
  return { created, read };
}

export async function readFinalizedAssessmentRecommendation(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  input: ExecuteFinalizedAssessmentRecommendationInput,
  dependencies: ExecuteFinalizedAssessmentRecommendationDependencies = {},
): Promise<OpportunityAssessmentRecommendationDto> {
  const { created, read } = await loadAssessment(service, actor, input);
  const blocked = gateCode(read);
  if (blocked || !read.currentRevision) return dtoFromRead(input.opportunityId, read);

  const runs = await service.listRecommendationRuns(actor, created.id);
  const latest = latestRunForRevision(runs, read.currentRevision.id);
  if (!latest || !TERMINAL_RUN_STATUSES.has(latest.resultStatus)) {
    return dtoFromRead(input.opportunityId, read, {
      executionAllowed: true,
      recommendationExecuted: false,
      recommendationRunCreated: false,
    });
  }

  let result: CanonicalLenderRecommendationResult | null = null;
  try {
    result = await evaluateCanonical(read, latest.asOf, actor.organizationId, dependencies);
  } catch {
    result = null;
  }
  return dtoFromRead(input.opportunityId, read, {
    executionAllowed: true,
    recommendationExecuted: true,
    recommendationRunCreated: false,
    runId: latest.id,
    requestHash: latest.requestHash,
    resultStatus: latest.resultStatus,
    failureCode: latest.failureCode,
    result,
  });
}

export async function executeFinalizedAssessmentRecommendation(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  input: ExecuteFinalizedAssessmentRecommendationInput,
  dependencies: ExecuteFinalizedAssessmentRecommendationDependencies = {},
): Promise<OpportunityAssessmentRecommendationDto> {
  const persist = input.persist !== false;
  const { created, read } = await loadAssessment(service, actor, input);
  const blocked = gateCode(read);
  if (blocked || !read.currentRevision) return dtoFromRead(input.opportunityId, read);

  let mapped;
  try {
    mapped = mapFinalizedAssessmentFactsToCanonical(read.facts);
  } catch (error) {
    if (error instanceof OpportunityAssessmentError) {
      const specific =
        error.message !== error.code && error.message in OPPORTUNITY_ASSESSMENT_RECOMMENDATION_COPY
          ? error.message
          : error.code;
      return dtoFromRead(input.opportunityId, read, { failureCode: specific, executionAllowed: false });
    }
    throw error;
  }

  const asOfDate = input.asOf ? new Date(input.asOf) : (dependencies.now?.() ?? new Date());
  const asOf = asOfDate.toISOString();
  const hash = requestHashFor({
    organizationId: actor.organizationId,
    opportunityId: input.opportunityId,
    revision: read.currentRevision,
    product: mapped.product,
    customer: mapped.customer,
    asOf,
  });
  const requestId = input.requestId?.trim() || dependencies.nextRequestId?.() || crypto.randomUUID();

  if (!persist) {
    const result = sanitizeResult(
      await (dependencies.recommend ?? recommendLendersCanonical)(
        { organizationId: actor.organizationId, product: mapped.product, customer: mapped.customer, asOf: asOfDate },
        dependencies,
      ),
    );
    return dtoFromRead(input.opportunityId, read, {
      executionAllowed: true,
      recommendationExecuted: true,
      recommendationRunCreated: false,
      requestHash: hash,
      resultStatus: result.status,
      result,
    });
  }

  const revisionIdBefore = read.currentRevision.id;
  const contentHashBefore = read.currentRevision.contentHash;
  const begun = await service.beginRecommendationRun(actor, {
    requestId,
    requestHash: hash,
    assessmentId: created.id,
    opportunityId: input.opportunityId,
    revisionId: read.currentRevision.id,
    asOf,
    mapperVersion: OPPORTUNITY_ASSESSMENT_MAPPER_VERSION,
    calculationVersion: "pending",
    factsSchemaVersion: OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
  });

  if (TERMINAL_RUN_STATUSES.has(begun.resultStatus)) {
    const after = await service.readCurrentAssessment(actor, {
      assessmentId: created.id,
      opportunityId: input.opportunityId,
      currentSourceFingerprint: input.currentSourceFingerprint ?? null,
    });
    return dtoFromRead(input.opportunityId, after, {
      executionAllowed: true,
      recommendationExecuted: true,
      recommendationRunCreated: false,
      runId: begun.id,
      requestHash: begun.requestHash,
      resultStatus: begun.resultStatus,
      failureCode: begun.failureCode,
      result: await safeEvaluate(read, begun.asOf, actor.organizationId, dependencies),
    });
  }

  let result: CanonicalLenderRecommendationResult;
  try {
    result = sanitizeResult(
      await (dependencies.recommend ?? recommendLendersCanonical)(
        { organizationId: actor.organizationId, product: mapped.product, customer: mapped.customer, asOf: asOfDate },
        dependencies,
      ),
    );
  } catch {
    const failed = await service.completeRecommendationRun(actor, {
      requestId: begun.id,
      requestHash: hash,
      resultStatus: "failed",
      failureCode: "RUN_FAILED",
    });
    const after = await unchangedRead(service, actor, created.id, input);
    assertRevisionUnchanged(after.currentRevision, revisionIdBefore, contentHashBefore);
    return dtoFromRead(input.opportunityId, after, {
      executionAllowed: true,
      recommendationExecuted: true,
      recommendationRunCreated: true,
      runId: failed.id,
      requestHash: failed.requestHash,
      resultStatus: failed.resultStatus,
      failureCode: failed.failureCode,
    });
  }

  const completed = await service.completeRecommendationRun(actor, {
    requestId: begun.id,
    requestHash: hash,
    resultStatus: result.status,
    missingInputCodes: result.missingInputs ?? [],
    rejectedProgrammeCodesJson: result.rejectedProgrammes.map((row) => ({
      programmeId: row.programmeId,
      reason: row.reason,
    })),
    acceptedProgrammeIdsJson: result.recommendations.map((card) => ({
      programmeId: card.programmeId,
      policyVersionId: card.policyVersionId,
      policyVersionNumber: card.policyVersionNumber,
      lenderScore: null,
      matchPercent: card.matchPercent,
      matchRank: card.matchRank,
      ruleSetVersion: result.versions.ruleSetVersion,
      criterionContributions: card.criterionContributions,
    })),
    cibilNotKnownDisclaimer: result.cibilNotKnownDisclaimer === true,
    failureCode: result.status === "configuration_error" ? "CONFIGURATION_ERROR" : null,
  });

  const after = await unchangedRead(service, actor, created.id, input);
  assertRevisionUnchanged(after.currentRevision, revisionIdBefore, contentHashBefore);
  return dtoFromRead(input.opportunityId, after, {
    executionAllowed: true,
    recommendationExecuted: true,
    recommendationRunCreated: begun.resultStatus === "pending",
    runId: completed.id,
    requestHash: completed.requestHash,
    resultStatus: completed.resultStatus,
    failureCode: completed.failureCode,
    result,
  });
}

async function unchangedRead(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  assessmentId: string,
  input: ExecuteFinalizedAssessmentRecommendationInput,
) {
  return service.readCurrentAssessment(actor, {
    assessmentId,
    opportunityId: input.opportunityId,
    currentSourceFingerprint: input.currentSourceFingerprint ?? null,
  });
}

function assertRevisionUnchanged(
  revision: OpportunityAssessmentRevisionRecord | null,
  revisionId: string,
  contentHash: string,
) {
  if (!revision || revision.id !== revisionId || revision.contentHash !== contentHash) {
    throw new OpportunityAssessmentError("ASSESSMENT_CONFLICT");
  }
}

function latestRunForRevision(
  runs: OpportunityAssessmentRecommendationRunRecord[],
  revisionId: string,
) {
  return [...runs]
    .filter((row) => row.revisionId === revisionId)
    .sort((a, b) => a.assessedAt.localeCompare(b.assessedAt))
    .at(-1) ?? null;
}

async function evaluateCanonical(
  read: OpportunityAssessmentReadModel,
  asOf: string,
  organizationId: string,
  dependencies: ExecuteFinalizedAssessmentRecommendationDependencies,
) {
  const mapped = mapFinalizedAssessmentFactsToCanonical(read.facts);
  return sanitizeResult(
    await (dependencies.recommend ?? recommendLendersCanonical)(
      { organizationId, product: mapped.product, customer: mapped.customer, asOf: new Date(asOf) },
      dependencies,
    ),
  );
}

async function safeEvaluate(
  read: OpportunityAssessmentReadModel,
  asOf: string,
  organizationId: string,
  dependencies: ExecuteFinalizedAssessmentRecommendationDependencies,
) {
  try {
    return await evaluateCanonical(read, asOf, organizationId, dependencies);
  } catch {
    return null;
  }
}

export { requestHashFor, gateCode, sanitizeResult };
