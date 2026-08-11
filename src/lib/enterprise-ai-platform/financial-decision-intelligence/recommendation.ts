/**
 * FDI Recommendation Framework (CO-AI-105).
 * Structured recommendations — never credit approvals or eligibility results.
 */

import type { EaiConfidenceBand } from "@/types/enterprise-ai-platform";
import type { EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type {
  EaiFdiEngineFact,
  EaiFdiRecommendation,
} from "@/types/enterprise-ai-financial-decision";
import { classifyEaiSarathiIntent } from "../domain-governance/intent-classifier";

function newId(): string {
  return `eai_fdi_rec_${crypto.randomUUID()}`;
}

const NOT_CALCULATED = [
  "eligibility",
  "FOIR",
  "DBR",
  "pricing",
  "credit_approval",
  "lender_policy",
] as const;

export function buildEaiFdiRecommendations(input: {
  question: string;
  contextPackage?: EaiContextPackage;
  engineFacts: EaiFdiEngineFact[];
  confidence: EaiConfidenceBand;
  blocked: boolean;
}): EaiFdiRecommendation[] {
  if (input.blocked) {
    return [
      {
        recommendationId: newId(),
        kind: "outside_domain_refused",
        title: "Outside domain",
        summary: "I'm not trained for this subject.",
        confidence: "low",
        supportingFactKeys: [],
        notCalculatedByFdi: [...NOT_CALCULATED],
        requiresHumanReview: false,
        requiresEnterpriseEngine: false,
      },
    ];
  }

  const intent = classifyEaiSarathiIntent(input.question);
  const domains = input.contextPackage?.domainsIncluded ?? [];
  const factKeys = input.engineFacts.map((f) => f.key);
  const recs: EaiFdiRecommendation[] = [];

  if (intent === "knowledge" || /\bwhat is\b|\bexplain\b/i.test(input.question)) {
    recs.push({
      recommendationId: newId(),
      kind: "explain",
      title: "Explain using knowledge context",
      summary:
        "Share a clear lending explanation using knowledge projections — not calculated eligibility.",
      confidence: input.confidence,
      supportingFactKeys: domains.includes("knowledge") ? ["knowledge"] : [],
      notCalculatedByFdi: [...NOT_CALCULATED],
      requiresHumanReview: false,
      requiresEnterpriseEngine: false,
    });
  }

  if (intent === "advisory" || /\bemi\b|\bafford/i.test(input.question)) {
    recs.push({
      recommendationId: newId(),
      kind: input.engineFacts.length > 0 ? "explain" : "defer_to_engine",
      title:
        input.engineFacts.length > 0
          ? "Explain engine-supplied affordability facts"
          : "Defer EMI / affordability to enterprise engines",
      summary:
        input.engineFacts.length > 0
          ? "Explain engine-supplied facts without recalculating FOIR or EMI."
          : "Ask clarifying questions, then request enterprise engine computation.",
      confidence: input.confidence,
      supportingFactKeys: factKeys,
      notCalculatedByFdi: [...NOT_CALCULATED],
      requiresHumanReview: true,
      requiresEnterpriseEngine: true,
    });
  }

  if (intent === "discovery" || /\blakh|₹|need\b/i.test(input.question)) {
    recs.push({
      recommendationId: newId(),
      kind: "clarify",
      title: "Clarify requirement before engine evaluation",
      summary:
        "Confirm amount, product intent, and profile — engines own eligibility later.",
      confidence: input.confidence === "high" ? "moderate" : input.confidence,
      supportingFactKeys: domains.filter((d) => d === "product" || d === "financial"),
      notCalculatedByFdi: [...NOT_CALCULATED],
      requiresHumanReview: true,
      requiresEnterpriseEngine: true,
    });
  }

  if (recs.length === 0) {
    recs.push({
      recommendationId: newId(),
      kind: "clarify",
      title: "Clarify financial intent",
      summary: "Ask one clarifying question within the lending domain.",
      confidence: "low",
      supportingFactKeys: [],
      notCalculatedByFdi: [...NOT_CALCULATED],
      requiresHumanReview: false,
      requiresEnterpriseEngine: false,
    });
  }

  // Always surface engine deferral reminder when no engine facts
  if (input.engineFacts.length === 0 && !recs.some((r) => r.kind === "defer_to_engine")) {
    recs.push({
      recommendationId: newId(),
      kind: "defer_to_engine",
      title: "Enterprise engines remain SSOT",
      summary: "Do not invent FOIR, DBR, pricing, or approval outcomes.",
      confidence: "moderate",
      supportingFactKeys: [],
      notCalculatedByFdi: [...NOT_CALCULATED],
      requiresHumanReview: false,
      requiresEnterpriseEngine: true,
    });
  }

  return recs;
}
