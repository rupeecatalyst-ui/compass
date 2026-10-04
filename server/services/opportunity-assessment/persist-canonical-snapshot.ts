import { buildOpportunityAssessmentSourceFingerprint } from "@/lib/opportunity-assessment/fingerprint";
import { OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION } from "@/types/opportunity-assessment";
import { hashOpportunityAssessmentCommand } from "./content-hash";
import {
  buildCanonicalAssessmentSnapshot,
  canonicalSnapshotSignature,
  evaluateCanonicalAssessmentSnapshot,
  type CanonicalAssessmentSources,
  type CanonicalSnapshotEvaluation,
} from "./canonical-snapshot";
import { OpportunityAssessmentService } from "./opportunity-assessment.service";
import { ASSESSMENT_NORMALIZED_INPUT_VERSION, type OpportunityAssessmentActorContext } from "./types";

export type PersistedCanonicalSnapshot = {
  evaluation: CanonicalSnapshotEvaluation;
  assessmentId: string;
  revisionId: string | null;
  appended: boolean;
  previousRevisionId: string | null;
};

export async function persistCanonicalAssessmentSnapshot(
  service: OpportunityAssessmentService,
  actor: OpportunityAssessmentActorContext,
  sources: CanonicalAssessmentSources,
): Promise<PersistedCanonicalSnapshot> {
  const facts = buildCanonicalAssessmentSnapshot(sources);
  const evaluation = evaluateCanonicalAssessmentSnapshot(facts, sources);
  const created = await service.getOrCreateAssessment(actor, sources.opportunityId);
  const read = await service.readCurrentAssessment(actor, {
    assessmentId: created.id,
    opportunityId: sources.opportunityId,
  });
  const previousRevisionId = read.currentRevision?.id ?? null;
  const nextSignature = canonicalSnapshotSignature(facts);
  const currentSignature = read.currentRevision ? canonicalSnapshotSignature(read.currentRevision.factsJson) : null;
  if (
    read.currentRevision &&
    currentSignature === nextSignature &&
    read.currentRevision.revisionKind === evaluation.revisionKind
  ) {
    return {
      evaluation,
      assessmentId: created.id,
      revisionId: read.currentRevision.id,
      appended: false,
      previousRevisionId,
    };
  }

  const fingerprint = buildOpportunityAssessmentSourceFingerprint({
    opportunityRowVersion: sources.rowVersion ?? 0,
  });
  const commandId = `canonical-snapshot-${hashOpportunityAssessmentCommand({
    opportunityId: sources.opportunityId,
    signature: nextSignature,
    kind: evaluation.revisionKind,
  }).slice(0, 24)}`;
  const revision = await service.saveRevision(actor, {
    assessmentId: created.id,
    opportunityId: sources.opportunityId,
    expectedRowVersion: read.rowVersion,
    commandId,
    commandHash: hashOpportunityAssessmentCommand({
      kind: evaluation.revisionKind,
      signature: nextSignature,
      opportunityId: sources.opportunityId,
    }),
    facts,
    sourceFingerprint: fingerprint,
    currentSourceFingerprint: fingerprint,
    kind: evaluation.revisionKind,
    journeyFields: evaluation.journeyFields,
    normalizedInput:
      evaluation.revisionKind === "FINALIZED"
        ? {
            source: "canonical-opportunity",
            factsSchemaVersion: OPPORTUNITY_ASSESSMENT_FACTS_SCHEMA_VERSION,
          }
        : null,
    normalizedInputVersion:
      evaluation.revisionKind === "FINALIZED" ? ASSESSMENT_NORMALIZED_INPUT_VERSION : null,
  });

  return {
    evaluation,
    assessmentId: created.id,
    revisionId: revision.id,
    appended: revision.id !== previousRevisionId,
    previousRevisionId,
  };
}
