/**
 * CO-AI-G2-W4 — Triple Comparison Engine types.
 * Internal evaluation only — never customer-facing.
 */

import type { EaoBenchmarkProductPath } from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";

export const EAO_TRIPLE_COMPARISON_VERSION = "1.0.0-g2-w4" as const;

export type EaoTripleArmId = "live_sarathi" | "reasoning_model" | "gold_standard";

export interface EaoTripleArmSnapshot {
  armId: EaoTripleArmId;
  label: string;
  facingText: string;
  /** 0–100 consultant benchmark score for this single turn */
  score: number;
  strengths: string[];
  weaknesses: string[];
  /** Absolute deviation from gold arm score (0 = aligned) */
  deviationFromGold: number;
  recommendation: string;
}

export interface EaoTripleComparisonInput {
  /** Customer message under evaluation */
  customerUtterance: string;
  /** Current SARATHI facing text */
  liveFacingText: string;
  /** Conversational reasoning model / shadow facing text */
  modelFacingText: string;
  /** Optional product hint for gold matching + scoring */
  productPath?: EaoBenchmarkProductPath;
  sessionId?: string;
  conversationId?: string;
  liveObjectiveHint?: string | null;
}

export interface EaoTripleComparisonResult {
  comparisonId: string;
  version: typeof EAO_TRIPLE_COMPARISON_VERSION;
  customerUtterance: string;
  productPath: EaoBenchmarkProductPath;
  matchedGold: {
    conversationId: string;
    productLabel: string;
    title: string;
    customerGoldText: string;
    consultantGoldText: string;
    matchScore: number;
  } | null;
  arms: EaoTripleArmSnapshot[];
  /** Aggregate: mean of live + model scores */
  score: number;
  /** Mean |arm.score - gold.score| for live + model */
  deviation: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  /** Always true — never surface to customer UI */
  customerIsolated: true;
  comparedAt: string;
}

export interface EaoTripleComparisonSuiteReport {
  reportId: string;
  title: string;
  version: typeof EAO_TRIPLE_COMPARISON_VERSION;
  comparisons: EaoTripleComparisonResult[];
  suiteScore: number;
  suiteDeviation: number;
  generatedAt: string;
  customerIsolated: true;
}
