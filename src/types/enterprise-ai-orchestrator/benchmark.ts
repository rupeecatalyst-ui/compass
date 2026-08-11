/**
 * CO-AI-G2-W2 — Consultant Benchmark types (reports only).
 */

import type {
  EaoBenchmarkDimensionId,
  EaoBenchmarkProductPath,
} from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";

export interface EaoBenchmarkTurn {
  turnIndex: number;
  customerUtterance: string;
  assistantFacingText: string;
  /** Optional live objective hint from experience layer */
  objectiveHint?: string | null;
}

export interface EaoBenchmarkConversationInput {
  conversationId: string;
  productPath: EaoBenchmarkProductPath;
  /** Label for report (e.g. fixture name) */
  scenarioLabel: string;
  turns: EaoBenchmarkTurn[];
  /** Who produced assistant text: live SARATHI, shadow stub, or future model */
  source: "live" | "shadow" | "model" | "fixture";
}

export interface EaoBenchmarkDimensionScore {
  dimensionId: EaoBenchmarkDimensionId;
  label: string;
  /** 0–100 */
  score: number;
  rationale: string;
  signals: string[];
}

export interface EaoBenchmarkConversationScore {
  scoreId: string;
  conversationId: string;
  scenarioLabel: string;
  productPath: EaoBenchmarkProductPath;
  source: EaoBenchmarkConversationInput["source"];
  /** 0–100 overall (mean of eight dimensions) */
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: EaoBenchmarkDimensionScore[];
  turnCount: number;
  benchmarkVersion: string;
  scoredAt: string;
}

export interface EaoBenchmarkSuiteReport {
  reportId: string;
  title: string;
  conversations: EaoBenchmarkConversationScore[];
  /** Mean overall across conversations */
  suiteOverallScore: number;
  byProductPath: Array<{
    productPath: EaoBenchmarkProductPath;
    averageScore: number;
    conversationCount: number;
  }>;
  byDimension: Array<{
    dimensionId: EaoBenchmarkDimensionId;
    label: string;
    averageScore: number;
  }>;
  benchmarkVersion: string;
  generatedAt: string;
}
