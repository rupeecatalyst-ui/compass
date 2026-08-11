/**
 * CO-ORG-004 — Analyze Deal result builder.
 * Mock lender confidence % removed. Recommendations require Product–Lender Matrix
 * + Credit & Risk Engine binding — return empty until those SSOTs are wired.
 */

import type { AnalyzeDealInputs, AnalyzeDealResult } from "@/types/analyze-deal";

export function buildEnterpriseAnalyzeDealResult(
  _inputs: AnalyzeDealInputs,
): AnalyzeDealResult {
  return {
    analyzedAt: new Date().toISOString(),
    overallConfidencePct: 0,
    improvementSuggestions: [
      "Lender recommendations require Product–Lender Matrix and Credit & Risk Engine — not yet bound to Analyze Deal.",
      "Capture complete income / obligation inputs for when eligibility engines are connected.",
      "Use Manual Recommendation / Lender Registry for operational lender selection today.",
    ],
    recommendations: [],
  };
}

/** @deprecated CO-ORG-004 — mock recommendations removed. */
export const buildMockAnalyzeDealResult = buildEnterpriseAnalyzeDealResult;
