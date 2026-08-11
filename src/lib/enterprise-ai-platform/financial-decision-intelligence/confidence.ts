/**
 * FDI Recommendation Confidence Model (CO-AI-105).
 * Assesses evidence completeness — never FOIR / eligibility math.
 */

import type { EaiContextPackage } from "@/types/enterprise-ai-context-intelligence";
import type {
  EaiFdiConfidenceAssessment,
  EaiFdiEngineFact,
} from "@/types/enterprise-ai-financial-decision";

export function assessEaiFdiConfidence(input: {
  contextPackage?: EaiContextPackage;
  engineFacts: EaiFdiEngineFact[];
  blocked: boolean;
  mixedDomain: boolean;
}): EaiFdiConfidenceAssessment {
  if (input.blocked) {
    return {
      band: "low",
      scoreHint: 0,
      reasons: ["Domain Boundary blocked — no financial recommendation"],
      evidenceDomains: [],
      engineFactCount: 0,
    };
  }

  const domains = input.contextPackage?.domainsIncluded ?? [];
  const engineFactCount = input.engineFacts.length;
  const reasons: string[] = [];
  let score = 35;

  if (domains.includes("knowledge")) {
    score += 10;
    reasons.push("Knowledge context present");
  }
  if (domains.includes("loan") || domains.includes("financial")) {
    score += 15;
    reasons.push("Loan / financial context present");
  }
  if (domains.includes("conversation")) {
    score += 5;
    reasons.push("Conversation memory present");
  }
  if (domains.includes("customer")) {
    score += 5;
    reasons.push("Customer projection available");
  }
  if (engineFactCount > 0) {
    score += Math.min(30, engineFactCount * 10);
    reasons.push(`${engineFactCount} enterprise engine fact(s) supplied`);
  } else {
    reasons.push("No enterprise engine facts — FDI can only explain / clarify");
  }
  if (input.mixedDomain) {
    score -= 15;
    reasons.push("Mixed-domain constraint reduces confidence");
  }

  score = Math.max(0, Math.min(100, score));
  const band =
    score >= 75 ? "high" : score >= 45 ? "moderate" : score > 0 ? "low" : "unspecified";

  // High confidence never implies approval — only evidence richness
  if (band === "high") {
    reasons.push("High evidence richness — not a credit approval");
  }

  return {
    band,
    scoreHint: score,
    reasons,
    evidenceDomains: domains,
    engineFactCount,
  };
}
