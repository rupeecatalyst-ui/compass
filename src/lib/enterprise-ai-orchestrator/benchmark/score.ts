/**
 * CO-AI-G2-W2 — Score a conversation across eight consultant dimensions.
 */

import {
  EAO_BENCHMARK_DIMENSION_IDS,
  EAO_BENCHMARK_DIMENSION_LABELS,
  EAO_CONSULTANT_BENCHMARK_VERSION,
} from "@/constants/enterprise-ai-orchestrator/consultant-benchmark";
import type {
  EaoBenchmarkConversationInput,
  EaoBenchmarkConversationScore,
  EaoBenchmarkDimensionScore,
  EaoBenchmarkSuiteReport,
} from "@/types/enterprise-ai-orchestrator/benchmark";
import { evaluateAllDimensions } from "./rubrics";

function gradeFromScore(overall: number): EaoBenchmarkConversationScore["grade"] {
  if (overall >= 85) return "A";
  if (overall >= 75) return "B";
  if (overall >= 65) return "C";
  if (overall >= 50) return "D";
  return "F";
}

export function scoreEaoConsultantConversation(
  input: EaoBenchmarkConversationInput,
): EaoBenchmarkConversationScore {
  const evals = evaluateAllDimensions(input.turns, input.productPath);
  const dimensions: EaoBenchmarkDimensionScore[] = EAO_BENCHMARK_DIMENSION_IDS.map(
    (id) => {
      const e = evals[id];
      return {
        dimensionId: id,
        label: EAO_BENCHMARK_DIMENSION_LABELS[id],
        score: e.score,
        rationale: e.rationale,
        signals: e.signals,
      };
    },
  );
  const overallScore =
    Math.round(
      (dimensions.reduce((s, d) => s + d.score, 0) / Math.max(1, dimensions.length)) * 10,
    ) / 10;

  return {
    scoreId: `eao_bench_${crypto.randomUUID()}`,
    conversationId: input.conversationId,
    scenarioLabel: input.scenarioLabel,
    productPath: input.productPath,
    source: input.source,
    overallScore,
    grade: gradeFromScore(overallScore),
    dimensions,
    turnCount: input.turns.length,
    benchmarkVersion: EAO_CONSULTANT_BENCHMARK_VERSION,
    scoredAt: new Date().toISOString(),
  };
}

export function buildEaoBenchmarkSuiteReport(input: {
  title: string;
  conversations: EaoBenchmarkConversationInput[];
}): EaoBenchmarkSuiteReport {
  const scored = input.conversations.map(scoreEaoConsultantConversation);
  const suiteOverallScore =
    scored.length === 0
      ? 0
      : Math.round(
          (scored.reduce((s, c) => s + c.overallScore, 0) / scored.length) * 10,
        ) / 10;

  const pathMap = new Map<string, { sum: number; n: number }>();
  for (const c of scored) {
    const cur = pathMap.get(c.productPath) ?? { sum: 0, n: 0 };
    cur.sum += c.overallScore;
    cur.n += 1;
    pathMap.set(c.productPath, cur);
  }

  const dimMap = new Map<string, { sum: number; n: number; label: string }>();
  for (const c of scored) {
    for (const d of c.dimensions) {
      const cur = dimMap.get(d.dimensionId) ?? { sum: 0, n: 0, label: d.label };
      cur.sum += d.score;
      cur.n += 1;
      dimMap.set(d.dimensionId, cur);
    }
  }

  return {
    reportId: `eao_bench_suite_${crypto.randomUUID()}`,
    title: input.title,
    conversations: scored,
    suiteOverallScore,
    byProductPath: [...pathMap.entries()].map(([productPath, v]) => ({
      productPath: productPath as EaoBenchmarkConversationScore["productPath"],
      averageScore: Math.round((v.sum / v.n) * 10) / 10,
      conversationCount: v.n,
    })),
    byDimension: EAO_BENCHMARK_DIMENSION_IDS.map((id) => {
      const v = dimMap.get(id);
      return {
        dimensionId: id,
        label: EAO_BENCHMARK_DIMENSION_LABELS[id],
        averageScore: v ? Math.round((v.sum / v.n) * 10) / 10 : 0,
      };
    }),
    benchmarkVersion: EAO_CONSULTANT_BENCHMARK_VERSION,
    generatedAt: new Date().toISOString(),
  };
}
