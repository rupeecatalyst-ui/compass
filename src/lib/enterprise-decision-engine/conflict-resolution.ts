/**
 * ERE conflict resolution — never silently ignore disagreements between knowledge packages.
 */

import type {
  DkfKnowledgeEvaluationTrace,
  EreConflictRecord,
  EreConflictResolutionMethod,
  EreConflictResolutionProfile,
  EreWeightedEvidenceItem,
} from "@/types/enterprise-decision-engine";

function winningKnowledgeFrom(
  evidence: EreWeightedEvidenceItem[],
  knowledgeTrace: DkfKnowledgeEvaluationTrace,
): Array<{ knowledgeId: string; name: string }> {
  const ids = new Set(evidence.flatMap((e) => e.sourceKnowledgeIds));
  const fromPkgs = knowledgeTrace.matchedPackages
    .filter((p) => ids.has(p.knowledgeId))
    .map((p) => ({ knowledgeId: p.knowledgeId, name: p.name }));
  if (fromPkgs.length) return fromPkgs;
  return evidence.slice(0, 2).map((e) => ({
    knowledgeId: e.sourceKnowledgeIds[0] ?? "context",
    name: e.sourceLabel,
  }));
}

function finalize(
  method: EreConflictResolutionMethod,
  partial: {
    conflictingKnowledge: EreConflictRecord["conflictingKnowledge"];
    winningEvidenceIds: string[];
    winningClaim: string;
    resolutionExplanation: string;
    unresolved: boolean;
    winningKnowledge: Array<{ knowledgeId: string; name: string }>;
  },
): Omit<EreConflictRecord, "conflictId"> {
  return {
    conflictingKnowledge: partial.conflictingKnowledge,
    resolutionStrategy: method,
    resolutionMethod: method,
    winningKnowledge: partial.winningKnowledge,
    winningEvidenceIds: partial.winningEvidenceIds,
    winningClaim: partial.winningClaim,
    resolutionExplanation: partial.resolutionExplanation,
    reason: partial.resolutionExplanation,
    unresolved: partial.unresolved,
  };
}

function resolveByMethod(
  method: EreConflictResolutionMethod,
  positives: EreWeightedEvidenceItem[],
  risks: EreWeightedEvidenceItem[],
  knowledgeTrace: DkfKnowledgeEvaluationTrace,
): Omit<EreConflictRecord, "conflictId"> {
  const positiveScore = positives.reduce((s, e) => s + e.compositeScore, 0);
  const riskScore = risks.reduce((s, e) => s + e.compositeScore, 0);
  const compliancePkgs = knowledgeTrace.matchedPackages.filter((p) => p.category === "compliance");
  const riskPkgs = knowledgeTrace.matchedPackages.filter(
    (p) => p.category === "risk" || p.kind === "risk_observation",
  );

  const conflictingKnowledge = [
    ...positives.slice(0, 2).map((e) => ({
      knowledgeId: e.sourceKnowledgeIds[0] ?? "context",
      name: e.sourceLabel,
      claim: e.label,
    })),
    ...risks.slice(0, 2).map((e) => ({
      knowledgeId: e.sourceKnowledgeIds[0] ?? "context",
      name: e.sourceLabel,
      claim: e.label,
    })),
  ];

  if (method === "prefer_compliance_category" && compliancePkgs.length) {
    return finalize(method, {
      conflictingKnowledge,
      winningEvidenceIds: risks.map((r) => r.evidenceId).slice(0, 2),
      winningClaim: `Compliance-oriented packages (${compliancePkgs.map((p) => p.name).join(", ")}) take precedence in advisory posture.`,
      resolutionExplanation:
        "Conflict resolution prefers compliance category knowledge when present.",
      unresolved: false,
      winningKnowledge: compliancePkgs.map((p) => ({
        knowledgeId: p.knowledgeId,
        name: p.name,
      })),
    });
  }

  if (method === "prefer_risk_observation" && (riskPkgs.length || risks.length)) {
    const winners = risks.length ? risks : positives;
    return finalize(method, {
      conflictingKnowledge,
      winningEvidenceIds: winners.map((r) => r.evidenceId),
      winningClaim: risks[0]?.label ?? "Risk observation posture preferred.",
      resolutionExplanation:
        "Conflict resolution prefers risk observation signals over optimistic claims.",
      unresolved: false,
      winningKnowledge: riskPkgs.length
        ? riskPkgs.map((p) => ({ knowledgeId: p.knowledgeId, name: p.name }))
        : winningKnowledgeFrom(winners, knowledgeTrace),
    });
  }

  if (method === "prefer_higher_reliability") {
    const pool = [...positives, ...risks].sort(
      (a, b) => b.dimensions.reliability - a.dimensions.reliability,
    );
    const winner = pool[0];
    return finalize(method, {
      conflictingKnowledge,
      winningEvidenceIds: winner ? [winner.evidenceId] : [],
      winningClaim: winner?.label ?? "No winner",
      resolutionExplanation: `Selected highest reliability evidence (${winner?.dimensions.reliability ?? 0}).`,
      unresolved: !winner,
      winningKnowledge: winner ? winningKnowledgeFrom([winner], knowledgeTrace) : [],
    });
  }

  if (method === "surface_unresolved") {
    return finalize(method, {
      conflictingKnowledge,
      winningEvidenceIds: [],
      winningClaim: "Conflict surfaced without forced winner — user judgment required.",
      resolutionExplanation:
        "Fallback strategy surfaces conflict; recommendation remains advisory.",
      unresolved: true,
      winningKnowledge: [],
    });
  }

  const riskWins = riskScore >= positiveScore;
  const winners = riskWins ? risks : positives;
  return finalize("weighted_majority", {
    conflictingKnowledge,
    winningEvidenceIds: winners.map((w) => w.evidenceId),
    winningClaim: winners[0]?.label ?? (riskWins ? "Risk posture" : "Positive posture"),
    resolutionExplanation: `Weighted majority: riskScore=${riskScore.toFixed(2)} vs positiveScore=${positiveScore.toFixed(2)}.`,
    unresolved: winners.length === 0,
    winningKnowledge: winningKnowledgeFrom(winners, knowledgeTrace),
  });
}

/**
 * Detect polarity conflicts between positive and risk evidence backed by knowledge packages.
 * Always records conflicts — never silent.
 */
export function resolveEreEvidenceConflicts(input: {
  weightedEvidence: EreWeightedEvidenceItem[];
  knowledgeTrace: DkfKnowledgeEvaluationTrace;
  conflictProfile: EreConflictResolutionProfile;
}): EreConflictRecord[] {
  const positives = input.weightedEvidence.filter(
    (e) => e.polarity === "positive" && !e.ignored,
  );
  const risks = input.weightedEvidence.filter((e) => e.polarity === "risk" && !e.ignored);

  if (!positives.length || !risks.length) {
    return [];
  }

  const strategy =
    input.conflictProfile.resolutionStrategy ?? input.conflictProfile.primaryMethod;

  const primary = resolveByMethod(strategy, positives, risks, input.knowledgeTrace);

  const records: EreConflictRecord[] = [
    {
      conflictId: crypto.randomUUID(),
      ...primary,
    },
  ];

  if (primary.unresolved && input.conflictProfile.fallbackMethod !== strategy) {
    const fallback = resolveByMethod(
      input.conflictProfile.fallbackMethod,
      positives,
      risks,
      input.knowledgeTrace,
    );
    records.push({
      conflictId: crypto.randomUUID(),
      ...fallback,
    });
  }

  const cats = new Set(input.knowledgeTrace.matchedPackages.map((p) => p.category));
  if (cats.has("risk") && (cats.has("product_guidance") || cats.has("customer_guidance"))) {
    const riskPkg = input.knowledgeTrace.matchedPackages.find((p) => p.category === "risk");
    const guidePkg = input.knowledgeTrace.matchedPackages.find(
      (p) => p.category === "product_guidance" || p.category === "customer_guidance",
    );
    if (riskPkg && guidePkg) {
      const method = strategy;
      const preferRisk =
        method === "prefer_risk_observation" ||
        method === "weighted_majority" ||
        method === "prefer_compliance_category";
      const winner = preferRisk ? riskPkg : guidePkg;
      records.push({
        conflictId: crypto.randomUUID(),
        ...finalize(method, {
          conflictingKnowledge: [
            {
              knowledgeId: riskPkg.knowledgeId,
              name: riskPkg.name,
              claim: riskPkg.advisorySnippet ?? "Risk observation",
            },
            {
              knowledgeId: guidePkg.knowledgeId,
              name: guidePkg.name,
              claim: guidePkg.advisorySnippet ?? "Guidance observation",
            },
          ],
          winningEvidenceIds: [],
          winningClaim: preferRisk
            ? `${riskPkg.name} prioritized for caution in advisory tone`
            : `${guidePkg.name} retained alongside risk (surfaced)`,
          resolutionExplanation:
            "Matched knowledge packages span risk and guidance categories — conflict recorded for audit.",
          unresolved: method === "surface_unresolved",
          winningKnowledge: [{ knowledgeId: winner.knowledgeId, name: winner.name }],
        }),
      });
    }
  }

  return records;
}
