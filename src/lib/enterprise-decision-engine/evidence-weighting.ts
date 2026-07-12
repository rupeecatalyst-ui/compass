/**
 * ERE evidence weighting — architecture for importance / reliability / freshness /
 * completeness / source / administratorPriority.
 * Multipliers come from ECG-ready profiles (scaffold = neutral). Do not hardcode business weights.
 */

import type {
  DkfEvidenceBundle,
  DkfKnowledgeEvaluationTrace,
  EdeDecisionContext,
  EreEvidenceWeightDimensions,
  EreEvidenceWeightProfile,
  EreWeightedEvidenceItem,
} from "@/types/enterprise-decision-engine";

function compositeFrom(
  dimensions: EreEvidenceWeightDimensions,
  multipliers: EreEvidenceWeightDimensions,
): number {
  const raw =
    dimensions.importance * multipliers.importance +
    dimensions.reliability * multipliers.reliability +
    dimensions.freshness * multipliers.freshness +
    dimensions.completeness * multipliers.completeness +
    dimensions.source * multipliers.source +
    dimensions.administratorPriority * multipliers.administratorPriority;
  const denom =
    multipliers.importance +
    multipliers.reliability +
    multipliers.freshness +
    multipliers.completeness +
    multipliers.source +
    multipliers.administratorPriority;
  return Math.round((raw / (denom || 1)) * 1000) / 1000;
}

function baseDimensions(
  partial: Partial<EreEvidenceWeightDimensions>,
): EreEvidenceWeightDimensions {
  return {
    importance: partial.importance ?? 0.5,
    reliability: partial.reliability ?? 0.5,
    freshness: partial.freshness ?? 0.5,
    completeness: partial.completeness ?? 0.5,
    source: partial.source ?? 0.5,
    administratorPriority: partial.administratorPriority ?? 0.5,
  };
}

function freshnessFromDays(days?: number): number {
  if (days == null) return 0.4;
  if (days <= 1) return 0.95;
  if (days <= 3) return 0.8;
  if (days <= 7) return 0.6;
  return 0.35;
}

/**
 * Materialise weighted evidence items from DKF evidence + context.
 * Dimension bases are observational for transparency — multipliers stay ECG / AX-owned.
 */
export function weightDkfEvidence(input: {
  evidence: DkfEvidenceBundle;
  knowledgeTrace: DkfKnowledgeEvaluationTrace;
  context: EdeDecisionContext;
  weightProfile: EreEvidenceWeightProfile;
}): EreWeightedEvidenceItem[] {
  const { evidence, knowledgeTrace, context, weightProfile } = input;
  const mult = weightProfile.dimensionMultipliers;
  const pkgIds = knowledgeTrace.matchedPackages.map((p) => p.knowledgeId);
  const items: EreWeightedEvidenceItem[] = [];
  let n = 0;
  const id = () => `ev-${++n}`;

  for (const label of evidence.positiveFactors) {
    const dimensions = baseDimensions({
      importance: 0.7,
      reliability: 0.75,
      freshness: freshnessFromDays(context.daysSinceLastActivity),
      completeness: evidence.missingInformation.length ? 0.55 : 0.85,
      source: 0.7,
      administratorPriority: 0.5,
    });
    items.push({
      evidenceId: id(),
      label,
      polarity: "positive",
      sourceKnowledgeIds: pkgIds,
      sourceLabel: "positive_factor",
      dimensions,
      compositeScore: compositeFrom(dimensions, mult),
      usedInRecommendation: true,
      ignored: false,
    });
  }

  for (const label of evidence.riskFactors) {
    const dimensions = baseDimensions({
      importance: 0.85,
      reliability: 0.8,
      freshness: freshnessFromDays(context.daysSinceLastActivity),
      completeness: evidence.missingInformation.length ? 0.5 : 0.8,
      source: 0.75,
      administratorPriority: 0.5,
    });
    items.push({
      evidenceId: id(),
      label,
      polarity: "risk",
      sourceKnowledgeIds: pkgIds,
      sourceLabel: "risk_factor",
      dimensions,
      compositeScore: compositeFrom(dimensions, mult),
      usedInRecommendation: true,
      ignored: false,
    });
  }

  for (const label of evidence.evidenceUsed) {
    if (
      evidence.positiveFactors.some((p) => label.includes(p)) ||
      evidence.riskFactors.some((r) => label.includes(r))
    ) {
      continue;
    }
    const dimensions = baseDimensions({
      importance: 0.55,
      reliability: 0.7,
      freshness: freshnessFromDays(context.daysSinceLastActivity),
      completeness: 0.7,
      source: 0.65,
      administratorPriority: 0.5,
    });
    items.push({
      evidenceId: id(),
      label,
      polarity: "neutral",
      sourceKnowledgeIds: pkgIds,
      sourceLabel: "evidence_used",
      dimensions,
      compositeScore: compositeFrom(dimensions, mult),
      usedInRecommendation: true,
      ignored: false,
    });
  }

  for (const label of evidence.missingInformation) {
    const dimensions = baseDimensions({
      importance: 0.6,
      reliability: 0.9,
      freshness: 0.5,
      completeness: 0.2,
      source: 0.8,
      administratorPriority: 0.5,
    });
    items.push({
      evidenceId: id(),
      label: `Missing: ${label}`,
      polarity: "missing",
      sourceKnowledgeIds: [],
      sourceLabel: "missing_information",
      dimensions,
      compositeScore: compositeFrom(dimensions, mult),
      usedInRecommendation: false,
      ignored: true,
      ignoreReason: "Information not present in context — cannot support a claim",
    });
  }

  for (const label of evidence.unknownFactors) {
    const dimensions = baseDimensions({
      importance: 0.45,
      reliability: 0.35,
      freshness: 0.4,
      completeness: 0.25,
      source: 0.4,
      administratorPriority: 0.5,
    });
    items.push({
      evidenceId: id(),
      label: `Unknown: ${label}`,
      polarity: "unknown",
      sourceKnowledgeIds: [],
      sourceLabel: "unknown_factor",
      dimensions,
      compositeScore: compositeFrom(dimensions, mult),
      usedInRecommendation: false,
      ignored: true,
      ignoreReason: "Unknown factor — excluded from supporting recommendation claims",
    });
  }

  return items.sort((a, b) => b.compositeScore - a.compositeScore);
}
