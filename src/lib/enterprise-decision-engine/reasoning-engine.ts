/**
 * Enterprise Reasoning Engine (ERE) — SPR-006C refined.
 * Observe → Know → Reason → Recommend → Explain → Record.
 * Transparent enterprise reasoning — not AI / ML. Advisory only. Never Reason → Execute.
 */

import type {
  DkfKnowledgeEvaluationTrace,
  EdeDecisionContext,
  EdeDecisionRequest,
  EreExplainabilityBundle,
  EreReasoningChainStage,
  EreReasoningTrace,
  EreWeightedEvidenceItem,
} from "@/types/enterprise-decision-engine";
import { recordEdeAudit } from "./audit-integration";
import { resolveEreEvidenceConflicts } from "./conflict-resolution";
import { getEdePorts } from "./composition";
import { weightDkfEvidence } from "./evidence-weighting";
import { resolveEreReasoningProfile } from "./reasoning-profile";

function stage(
  stageId: EreReasoningChainStage["stageId"],
  label: string,
  summary: string,
  detail?: Record<string, unknown>,
): EreReasoningChainStage {
  return {
    stageId,
    label,
    status: "completed",
    summary,
    detail,
    completedOn: new Date().toISOString(),
  };
}

function buildExplainability(input: {
  recommendation: string;
  why: string;
  knowledgeNames: string[];
  used: EreWeightedEvidenceItem[];
  missing: string[];
  assumptions: string[];
  suggestedNextStep: string;
  template: { whatPrefix: string; whyPrefix: string; nextStepPrefix: string };
}): EreExplainabilityBundle {
  const sorted = [...input.used].sort((a, b) => b.compositeScore - a.compositeScore);
  const strongest = sorted.slice(0, 3).map((e) => `${e.label} (score ${e.compositeScore})`);
  const weakest = [...sorted]
    .reverse()
    .slice(0, 3)
    .map((e) => `${e.label} (score ${e.compositeScore})`);

  return {
    whatRecommended: `${input.template.whatPrefix}: ${input.recommendation}`,
    why: `${input.template.whyPrefix}: ${input.why}`,
    knowledgeEvaluated: input.knowledgeNames,
    strongestEvidence: strongest,
    highestImpactEvidence: strongest,
    weakestEvidence: weakest,
    assumptions: input.assumptions,
    missingInformation: input.missing,
    suggestedNextStep: `${input.template.nextStepPrefix}: ${input.suggestedNextStep}`,
  };
}

export function runEnterpriseReasoningEngine(input: {
  request: EdeDecisionRequest;
  decisionId: string;
  context: EdeDecisionContext;
  knowledgeTrace: DkfKnowledgeEvaluationTrace;
  baseRecommendation: string;
  baseNextSteps: string[];
  baseExplanation: string;
  actorId: string;
}): {
  recommendation: string;
  nextSteps: string[];
  explanation: string;
  trace: EreReasoningTrace;
} {
  const { profile, source } = resolveEreReasoningProfile();
  const chain: EreReasoningChainStage[] = [];
  const tmpl = profile.explainabilityTemplate;

  chain.push(
    stage(
      "decision_request",
      "Decision Request",
      `Category ${input.request.decisionCategory} · trigger ${input.request.triggerSource}`,
      {
        decisionId: input.decisionId,
        requestId: input.request.id,
        reason: input.request.reason,
      },
    ),
  );

  chain.push(
    stage(
      "context_collection",
      "Context Collection",
      `Opportunity ${input.context.opportunityCode ?? input.context.opportunityId ?? "—"} · stage ${input.context.stageCode ?? "—"}`,
      {
        healthScore: input.context.healthScore,
        stageCode: input.context.stageCode,
        collectedOn: input.context.collectedOn,
      },
    ),
  );

  chain.push(
    stage(
      "knowledge_matching",
      "Knowledge Matching",
      `${input.knowledgeTrace.matchedPackages.length} packages matched of ${input.knowledgeTrace.applicablePackages.length} applicable`,
      {
        knowledgeSource: input.knowledgeTrace.knowledgeSource,
        matched: input.knowledgeTrace.matchedPackages.map((p) => p.name),
      },
    ),
  );

  const rawEvidence = input.knowledgeTrace.evidence;
  chain.push(
    stage(
      "evidence_collection",
      "Evidence Collection",
      `${rawEvidence.evidenceUsed.length} used · ${rawEvidence.missingInformation.length} missing · ${rawEvidence.positiveFactors.length} positive · ${rawEvidence.riskFactors.length} risk`,
      {
        evidenceUsed: rawEvidence.evidenceUsed,
        missingInformation: rawEvidence.missingInformation,
        positiveFactors: rawEvidence.positiveFactors,
        riskFactors: rawEvidence.riskFactors,
        unknownFactors: rawEvidence.unknownFactors,
      },
    ),
  );

  const weighted = weightDkfEvidence({
    evidence: rawEvidence,
    knowledgeTrace: input.knowledgeTrace,
    context: input.context,
    weightProfile: profile.evidenceWeighting,
  });

  chain.push(
    stage(
      "evidence_weighting",
      "Evidence Weighting",
      `${weighted.filter((e) => !e.ignored).length} weighted · ${weighted.filter((e) => e.ignored).length} ignored · profile ${profile.evidenceWeighting.profileId}`,
      {
        weightProfileId: profile.evidenceWeighting.profileId,
        weightSource: profile.evidenceWeighting.source,
        dimensions: Object.keys(profile.evidenceWeighting.dimensionMultipliers),
        topScores: weighted.slice(0, 5).map((e) => ({
          id: e.evidenceId,
          label: e.label,
          score: e.compositeScore,
          polarity: e.polarity,
          administratorPriority: e.dimensions.administratorPriority,
        })),
      },
    ),
  );

  const conflicts = resolveEreEvidenceConflicts({
    weightedEvidence: weighted,
    knowledgeTrace: input.knowledgeTrace,
    conflictProfile: profile.conflictResolution,
  });

  const strategy =
    profile.conflictResolution.resolutionStrategy ?? profile.conflictResolution.primaryMethod;

  chain.push(
    stage(
      "conflict_resolution",
      "Conflict Resolution",
      conflicts.length
        ? `${conflicts.length} conflict(s) recorded · strategy ${strategy}`
        : "No polarity conflicts between positive and risk evidence",
      {
        strategyProfileId: profile.conflictResolution.profileId,
        resolutionStrategy: strategy,
        conflicts: conflicts.map((c) => ({
          conflictId: c.conflictId,
          resolutionStrategy: c.resolutionStrategy,
          winningKnowledge: c.winningKnowledge,
          winningClaim: c.winningClaim,
          resolutionExplanation: c.resolutionExplanation,
          unresolved: c.unresolved,
        })),
      },
    ),
  );

  const used = weighted.filter((e) => !e.ignored);
  const ignored = weighted.filter((e) => e.ignored);
  const missingEvidence = rawEvidence.missingInformation;
  const winningIds = new Set(conflicts.flatMap((c) => c.winningEvidenceIds));
  const prioritized = used.filter((e) => winningIds.has(e.evidenceId));
  const pathLead =
    prioritized.length > 0
      ? prioritized
      : used.filter((e) => e.polarity === "risk").length
        ? used.filter((e) => e.polarity === "risk")
        : used.filter((e) => e.polarity === "positive").length
          ? used.filter((e) => e.polarity === "positive")
          : used;

  const finalReasoningPath = [
    `Matched ${input.knowledgeTrace.matchedPackages.length} knowledge package(s)`,
    `Collected evidence (${rawEvidence.evidenceUsed.length} items)`,
    `Weighted ${used.length} evidence item(s) via ${profile.evidenceWeighting.name}`,
    conflicts.length
      ? `Resolved ${conflicts.length} conflict(s) via ${strategy}`
      : "No conflicts required resolution",
    `Prioritized: ${
      pathLead
        .slice(0, 3)
        .map((e) => e.label)
        .join("; ") || "context-limited advisory"
    }`,
    "Recommendation remains advisory — execution outside ERE",
  ];

  chain.push(
    stage("reasoning", "Reasoning", finalReasoningPath.join(" → "), {
      path: finalReasoningPath,
      reasoningProfileId: profile.profileId,
    }),
  );

  const conflictSuffix = conflicts.length
    ? ` Conflicts resolved: ${conflicts.map((c) => c.winningClaim).join("; ")}.`
    : "";
  const recommendation = `${input.baseRecommendation}${
    pathLead[0] ? ` Strongest reasoned signal: ${pathLead[0].label}.` : ""
  }${conflictSuffix}`.trim();

  const assumptions = [
    "Context fields supplied by caller are treated as authoritative for this evaluation",
    `Evidence weight multipliers from ${profile.evidenceWeighting.source} profile ${profile.evidenceWeighting.profileId}`,
    "No predictive model or scoring engine was used",
    "ERE does not execute workflows, tasks, approvals, or notifications",
  ];

  const nextSteps = [
    ...input.baseNextSteps.slice(0, 2),
    conflicts.some((c) => c.unresolved)
      ? "Review unresolved knowledge conflicts before acting"
      : "Review reasoning trace if advisory posture is unclear",
  ].slice(0, 4);

  const explainability = buildExplainability({
    recommendation,
    why: [
      input.baseExplanation,
      ...finalReasoningPath.slice(0, 4),
      conflicts[0] ? `Conflict note: ${conflicts[0].resolutionExplanation}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    knowledgeNames: input.knowledgeTrace.matchedPackages.map((p) => p.name),
    used,
    missing: missingEvidence,
    assumptions,
    suggestedNextStep: nextSteps[0] ?? "Review the recommendation and decide consciously.",
    template: tmpl,
  });

  const explanation = [
    explainability.whatRecommended,
    explainability.why,
    `Knowledge packages used: ${explainability.knowledgeEvaluated.join("; ") || "none matched"}`,
    `Highest impact evidence: ${explainability.highestImpactEvidence.join("; ") || "none"}`,
    explainability.missingInformation.length
      ? `Missing evidence: ${explainability.missingInformation.join("; ")}`
      : "Missing evidence: none recorded",
    `Assumptions: ${explainability.assumptions.join("; ")}`,
    explainability.suggestedNextStep,
  ].join(" ");

  chain.push(
    stage("recommendation", "Recommendation", recommendation.slice(0, 240), {
      nextSteps,
      finalRecommendation: recommendation,
    }),
  );
  chain.push(
    stage("explanation", "Explanation", "Full explainability bundle attached to trace", {
      explainability,
    }),
  );
  chain.push(
    stage(
      "dialogue_history",
      "Dialogue History",
      "Reasoning artefacts prepared for Dialogue Center publication",
      { pendingPublish: true },
    ),
  );

  const knowledgePackagesEvaluated = input.knowledgeTrace.matchedPackages.map((p) => ({
    knowledgeId: p.knowledgeId,
    name: p.name,
    category: p.category,
    version: p.version,
  }));

  const trace: EreReasoningTrace = {
    traceId: crypto.randomUUID(),
    decisionId: input.decisionId,
    requestId: input.request.id,
    generatedBy: "Enterprise Reasoning Engine",
    knowledgePackagesEvaluated,
    knowledgeUsed: knowledgePackagesEvaluated,
    supportingEvidence: used,
    evidenceUsed: used,
    evidenceIgnored: ignored,
    missingEvidence,
    conflicts,
    finalRecommendation: recommendation,
    finalReasoningPath,
    chain,
    explainability,
    reasoningProfileId: profile.profileId,
    reasoningProfileSource: source,
    createdOn: new Date().toISOString(),
  };

  getEdePorts().reasoningTraces.save(trace);
  recordEdeAudit({
    entityId: trace.traceId,
    entityType: "reasoning_trace",
    action: "created",
    actorId: input.actorId,
    remarks: `ERE trace ${trace.traceId} decision=${input.decisionId} conflicts=${conflicts.length}`,
  });

  return { recommendation, nextSteps, explanation, trace };
}

export function getEreReasoningTrace(traceId: string): EreReasoningTrace | undefined {
  return getEdePorts().reasoningTraces.findById(traceId);
}

export function listEreReasoningTraces(decisionId?: string): EreReasoningTrace[] {
  const rows = decisionId
    ? getEdePorts().reasoningTraces.listByDecision(decisionId)
    : getEdePorts().reasoningTraces.list();
  return [...rows].sort(
    (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
  );
}
