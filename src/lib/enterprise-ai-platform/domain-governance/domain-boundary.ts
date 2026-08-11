/**
 * Domain Boundary Engine — deterministic zone classification (CO-AI-104 DIE).
 * The LLM never decides domain membership alone.
 * Outside domain → fixed refusal; no LLM; no knowledge search.
 */

import {
  EAI_DOMAIN_GOVERNANCE_VERSION,
  EAI_DOMAIN_REDIRECT_HINTS,
  EAI_KNOWLEDGE_TOPICS,
  EAI_OUTSIDE_DOMAIN_REFUSAL,
} from "@/constants/enterprise-ai-platform/domain-governance";
import { EAI_TOPIC_TO_TONE } from "@/constants/enterprise-ai-platform/tone-library";
import type {
  EaiDomainBoundaryDecision,
  EaiDomainBoundaryRequest,
  EaiDomainMatchHit,
  EaiKnowledgeZoneId,
  EaiToneCategoryId,
} from "@/types/enterprise-ai-domain-governance";
import { classifyEaiSarathiIntent } from "./intent-classifier";
import { buildEaiSafeRefusal } from "./safe-refusal";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function matchTopics(utterance: string): EaiDomainMatchHit[] {
  const hits: EaiDomainMatchHit[] = [];
  for (const topic of EAI_KNOWLEDGE_TOPICS) {
    if (topic.patterns.some((p) => p.test(utterance))) {
      hits.push({ topicId: topic.topicId, label: topic.label, zone: topic.zone });
    }
  }
  return hits;
}

function scoreZones(hits: EaiDomainMatchHit[]): Record<EaiKnowledgeZoneId, number> {
  const scores: Record<EaiKnowledgeZoneId, number> = {
    zone_1_core: 0,
    zone_2_adjacent: 0,
    zone_3_outside: 0,
  };
  for (const hit of hits) {
    scores[hit.zone] += 1;
  }
  return scores;
}

function resolveToneCategory(hits: EaiDomainMatchHit[]): EaiToneCategoryId | undefined {
  for (const hit of hits) {
    const mapped = EAI_TOPIC_TO_TONE[hit.topicId];
    if (mapped) return mapped;
  }
  return undefined;
}

/**
 * Evaluate whether a request belongs to SARATHI's approved financial domain.
 * Enforcement is identical across Behaviour Packs when utterance is present.
 */
export function evaluateEaiDomainBoundary(
  request: EaiDomainBoundaryRequest,
): EaiDomainBoundaryDecision {
  const utterance = (request.utterance ?? "").trim();
  const hits = utterance ? matchTopics(utterance) : [];
  const scores = scoreZones(hits);
  const intent = classifyEaiSarathiIntent(utterance, hits);
  const mixedDomain =
    (scores.zone_1_core > 0 || scores.zone_2_adjacent > 0) && scores.zone_3_outside > 0;

  let zone: EaiDomainBoundaryDecision["zone"] = "unknown";
  let outcome: EaiDomainBoundaryDecision["outcome"] = "refuse_unknown";
  const reasons: string[] = [];

  if (!utterance) {
    zone = "unknown";
    outcome = "refuse_unknown";
    reasons.push("Empty utterance — domain cannot be affirmed");
  } else if (mixedDomain) {
    zone = scores.zone_1_core > 0 ? "zone_1_core" : "zone_2_adjacent";
    outcome = "allow_mixed_constrained";
    reasons.push(
      "Mixed-domain request: lending topics may proceed; outside topics must not be answered",
    );
  } else if (scores.zone_3_outside > 0) {
    zone = "zone_3_outside";
    outcome = "refuse_outside";
    reasons.push(
      `Outside domain topics matched: ${hits
        .filter((h) => h.zone === "zone_3_outside")
        .map((h) => h.label)
        .join(", ")}`,
    );
  } else if (scores.zone_1_core > 0) {
    zone = "zone_1_core";
    outcome = "allow_core";
    reasons.push("Core lending / financial domain matched");
  } else if (scores.zone_2_adjacent > 0) {
    zone = "zone_2_adjacent";
    outcome = "allow_adjacent";
    reasons.push("Adjacent domain matched — answer only if useful to a borrowing decision");
  } else {
    zone = "unknown";
    outcome = "refuse_unknown";
    reasons.push("No recognised lending domain — treated as outside domain");
  }

  const hasUtterance = utterance.length > 0;
  const enforce =
    request.enforce === true || (request.enforce !== false && hasUtterance);

  const blocks =
    hasUtterance &&
    enforce &&
    (outcome === "refuse_outside" || outcome === "refuse_unknown");

  const policyDeny = blocks;
  const blocksLlm = blocks;
  const blocksKnowledge = blocks;

  const safeRefusalText = policyDeny
    ? buildEaiSafeRefusal({ outcome })
    : undefined;

  return {
    decisionId: newId("eai_dom"),
    decidedAt: new Date().toISOString(),
    governanceVersion: EAI_DOMAIN_GOVERNANCE_VERSION,
    utterancePreview: utterance.slice(0, 160),
    zone,
    outcome,
    blocksLlm,
    blocksKnowledge,
    policyDeny,
    intent: policyDeny ? "unsupported" : intent,
    matchedTopics: hits,
    mixedDomain,
    reasons,
    safeRefusalText,
    redirectHints: policyDeny ? [] : [...EAI_DOMAIN_REDIRECT_HINTS],
    toneCategoryId: policyDeny ? undefined : resolveToneCategory(hits),
  };
}

export function assertEaiDomainAllowsLlm(
  decision: EaiDomainBoundaryDecision,
): { ok: true } | { ok: false; reason: string; refusalText: string } {
  if (decision.blocksLlm) {
    return {
      ok: false,
      reason: decision.reasons[0] ?? "Domain boundary blocked LLM reasoning",
      refusalText: decision.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
    };
  }
  return { ok: true };
}

export function assertEaiDomainAllowsKnowledge(
  decision: EaiDomainBoundaryDecision,
): { ok: true } | { ok: false; reason: string; refusalText: string } {
  if (decision.blocksKnowledge) {
    return {
      ok: false,
      reason: decision.reasons[0] ?? "Domain boundary blocked knowledge retrieval",
      refusalText: decision.safeRefusalText ?? EAI_OUTSIDE_DOMAIN_REFUSAL,
    };
  }
  return { ok: true };
}
