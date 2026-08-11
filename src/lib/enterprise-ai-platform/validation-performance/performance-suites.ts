/**
 * Latency, token, context optimisation, load, and aggregate performance suites (CO-AI-116).
 */

import {
  EAI_DEFAULT_CONTEXT_BUDGET_POLICY,
} from "@/constants/enterprise-ai-platform/context-intelligence";
import {
  EAI_VALIDATION_CHARS_PER_TOKEN,
  EAI_VALIDATION_IN_DOMAIN_UTTERANCES,
  EAI_VALIDATION_LOAD_CONCURRENCY,
  EAI_VALIDATION_LOAD_ITERATIONS,
  EAI_VALIDATION_TURN_LATENCY_BUDGET_MS,
} from "@/constants/enterprise-ai-platform/validation-performance";
import type {
  EaiContextOptimisationResult,
  EaiLatencyAnalysis,
  EaiLoadTestResult,
  EaiTokenOptimisationResult,
  EaiValidationSuiteResult,
} from "@/types/enterprise-ai-validation-performance";
import { ensureEaiBehaviourPackScaffolds } from "../behaviour-packs";
import { buildEaiContextPackage } from "../context-intelligence/package-builder";
import { runEaiSarathiConversationTurn } from "../conversation-experience/turn-orchestrator";
import { caseResult, percentile, timeEaiAsync } from "./timing";

function estimateTokens(chars: number): number {
  return Math.ceil(chars / EAI_VALIDATION_CHARS_PER_TOKEN);
}

export async function analyzeEaiLatency(): Promise<{
  analysis: EaiLatencyAnalysis;
  suite: EaiValidationSuiteResult;
}> {
  const start = performance.now();
  const cases = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  ensureEaiBehaviourPackScaffolds();

  const samples: EaiLatencyAnalysis["samples"] = [];
  for (const utterance of EAI_VALIDATION_IN_DOMAIN_UTTERANCES) {
    const { result, durationMs } = await timeEaiAsync(() =>
      runEaiSarathiConversationTurn({
        utterance,
        personaPackId: "sarathi_customer",
      }),
    );
    samples.push({ operation: `turn:${utterance.slice(0, 24)}`, durationMs });
    const ok = !result.blocked && durationMs <= EAI_VALIDATION_TURN_LATENCY_BUDGET_MS;
    cases.push(
      caseResult({
        caseId: `lat.${samples.length}`,
        suiteId: "latency",
        title: `Latency sample ${samples.length}`,
        ok: !result.blocked,
        warning: durationMs > EAI_VALIDATION_TURN_LATENCY_BUDGET_MS * 0.8,
        message: `duration=${durationMs}ms blocked=${result.blocked}`,
        durationMs,
        metrics: { durationMs, blocked: result.blocked },
      }),
    );
    if (result.blocked) errors.push(`Latency sample blocked: ${utterance}`);
    if (durationMs > EAI_VALIDATION_TURN_LATENCY_BUDGET_MS) {
      errors.push(`Latency exceeded budget (${durationMs}ms > ${EAI_VALIDATION_TURN_LATENCY_BUDGET_MS}ms)`);
    } else if (durationMs > EAI_VALIDATION_TURN_LATENCY_BUDGET_MS * 0.8) {
      warnings.push(`Latency near budget: ${durationMs}ms`);
    }
    void ok;
  }

  const durations = samples.map((s) => s.durationMs).sort((a, b) => a - b);
  const averageMs =
    durations.length === 0
      ? 0
      : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const analysis: EaiLatencyAnalysis = {
    samples,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: durations[durations.length - 1] ?? 0,
    averageMs,
    withinBudget: (durations[durations.length - 1] ?? 0) <= EAI_VALIDATION_TURN_LATENCY_BUDGET_MS,
    budgetMs: EAI_VALIDATION_TURN_LATENCY_BUDGET_MS,
  };

  cases.push(
    caseResult({
      caseId: "lat.summary",
      suiteId: "latency",
      title: "Latency within stub budget",
      ok: analysis.withinBudget,
      message: `p50=${analysis.p50Ms} p95=${analysis.p95Ms} max=${analysis.maxMs}`,
      durationMs: 0,
      metrics: {
        p50Ms: analysis.p50Ms,
        p95Ms: analysis.p95Ms,
        maxMs: analysis.maxMs,
        averageMs: analysis.averageMs,
      },
    }),
  );

  return {
    analysis,
    suite: {
      suiteId: "latency",
      passed: errors.length === 0,
      cases,
      durationMs: Math.round(performance.now() - start),
      errors,
      warnings,
    },
  };
}

export async function analyzeEaiTokenOptimisation(): Promise<{
  result: EaiTokenOptimisationResult;
  suite: EaiValidationSuiteResult;
}> {
  const start = performance.now();
  const cases = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  ensureEaiBehaviourPackScaffolds();

  const utterance = EAI_VALIDATION_IN_DOMAIN_UTTERANCES[0]!;
  const { result: turn, durationMs } = await timeEaiAsync(() =>
    runEaiSarathiConversationTurn({
      utterance,
      personaPackId: "sarathi_customer",
    }),
  );

  const inputChars = utterance.length + (turn.continuity.messages.map((m) => m.text).join("").length);
  const outputChars = turn.facingText.length;
  const recommendations: string[] = [];
  if (inputChars > 4_000) recommendations.push("Trim continuity history before compile");
  if (outputChars > 800) recommendations.push("Enforce Micro Communication on facing text");
  recommendations.push("Prefer curated Tone Library lines over long LLM prose");
  recommendations.push("Keep Context Package under budget with domain priority truncation");

  const result: EaiTokenOptimisationResult = {
    approximateInputChars: inputChars,
    approximateOutputChars: outputChars,
    estimatedInputTokens: estimateTokens(inputChars),
    estimatedOutputTokens: estimateTokens(outputChars),
    recommendations,
    optimised: outputChars <= 800 && inputChars <= 8_000,
  };

  cases.push(
    caseResult({
      caseId: "tok.estimate",
      suiteId: "token_optimisation",
      title: "Token heuristic estimate within soft targets",
      ok: result.optimised && !turn.blocked,
      message: `in≈${result.estimatedInputTokens} tok out≈${result.estimatedOutputTokens} tok`,
      durationMs,
      metrics: {
        estimatedInputTokens: result.estimatedInputTokens,
        estimatedOutputTokens: result.estimatedOutputTokens,
      },
    }),
  );
  if (!result.optimised) warnings.push("Token soft targets exceeded — review Micro Communication");
  if (turn.blocked) errors.push("Token suite in-domain turn blocked");

  return {
    result,
    suite: {
      suiteId: "token_optimisation",
      passed: errors.length === 0,
      cases,
      durationMs: Math.round(performance.now() - start),
      errors,
      warnings,
    },
  };
}

export async function analyzeEaiContextOptimisation(): Promise<{
  result: EaiContextOptimisationResult;
  suite: EaiValidationSuiteResult;
}> {
  const start = performance.now();
  const cases = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  ensureEaiBehaviourPackScaffolds();

  const pkg = await buildEaiContextPackage({
    sessionId: "eai_val_opt",
    conversationId: "eai_val_opt_conv",
    personaPackId: "sarathi_customer",
    requestHint: "Balance Transfer EMI reduction documents eligibility",
    conversationMemory: {
      intent: "Balance Transfer",
      knownFacts: [
        { key: "product_interest", value: "Balance Transfer", provenance: "user_stated" },
        { key: "employment_type", value: "salaried", provenance: "user_stated" },
      ],
      openQuestions: ["Outstanding amount?", "Current lender?"],
      previousRecommendations: ["Let's reduce your borrowing cost."],
      outstandingActions: [],
      summary: "BT consultation in progress",
    },
    budgetPolicy: EAI_DEFAULT_CONTEXT_BUDGET_POLICY,
  });

  const recommendations = [
    "Retain conversation + product + knowledge domains first",
    "Replace low-priority domains with summaries under pressure",
    "Never include raw registry rows in Context Packages",
  ];
  if (pkg.budget.truncated) {
    recommendations.unshift("Truncation engaged — verify critical domains retained");
  }

  const result: EaiContextOptimisationResult = {
    budgetChars: EAI_DEFAULT_CONTEXT_BUDGET_POLICY.maxApproximateChars,
    usedChars: pkg.budget.approximateChars,
    truncated: pkg.budget.truncated,
    domainsIncluded: [...pkg.domainsIncluded],
    recommendations,
    withinBudget: pkg.budget.approximateChars <= EAI_DEFAULT_CONTEXT_BUDGET_POLICY.maxApproximateChars,
  };

  cases.push(
    caseResult({
      caseId: "ctxopt.budget",
      suiteId: "context_optimisation",
      title: "Context package within budget",
      ok: result.withinBudget,
      message: `used=${result.usedChars}/${result.budgetChars}`,
      durationMs: Math.round(performance.now() - start),
      metrics: {
        usedChars: result.usedChars,
        budgetChars: result.budgetChars,
        truncated: result.truncated,
      },
    }),
  );
  if (!result.withinBudget) errors.push("Context optimisation exceeded budget");
  if (result.truncated) warnings.push("Context truncation active");

  return {
    result,
    suite: {
      suiteId: "context_optimisation",
      passed: errors.length === 0,
      cases,
      durationMs: Math.round(performance.now() - start),
      errors,
      warnings,
    },
  };
}

export async function runEaiLoadTestingSuite(): Promise<{
  result: EaiLoadTestResult;
  suite: EaiValidationSuiteResult;
}> {
  const start = performance.now();
  const cases = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  ensureEaiBehaviourPackScaffolds();

  const iterations = EAI_VALIDATION_LOAD_ITERATIONS;
  const concurrency = EAI_VALIDATION_LOAD_CONCURRENCY;
  const latencies: number[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let wave = 0; wave < Math.ceil(iterations / concurrency); wave += 1) {
    const batch = Array.from({ length: concurrency }, (_, i) => {
      const n = wave * concurrency + i;
      if (n >= iterations) return null;
      const utterance =
        EAI_VALIDATION_IN_DOMAIN_UTTERANCES[n % EAI_VALIDATION_IN_DOMAIN_UTTERANCES.length]!;
      return timeEaiAsync(() =>
        runEaiSarathiConversationTurn({
          utterance,
          personaPackId: "sarathi_customer",
        }),
      );
    }).filter(Boolean) as Array<
      ReturnType<typeof timeEaiAsync<Awaited<ReturnType<typeof runEaiSarathiConversationTurn>>>>
    >;

    const settled = await Promise.all(batch);
    for (const item of settled) {
      latencies.push(item.durationMs);
      if (!item.result.blocked && item.result.facingText.trim()) successCount += 1;
      else failureCount += 1;
    }
  }

  const totalDurationMs = Math.round(performance.now() - start);
  const averageLatencyMs =
    latencies.length === 0
      ? 0
      : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const result: EaiLoadTestResult = {
    concurrency,
    iterations,
    successCount,
    failureCount,
    totalDurationMs,
    throughputPerSec:
      totalDurationMs === 0 ? 0 : Math.round((successCount / totalDurationMs) * 1000 * 100) / 100,
    averageLatencyMs,
  };

  cases.push(
    caseResult({
      caseId: "load.summary",
      suiteId: "load_testing",
      title: "Load test wave completed",
      ok: failureCount === 0 && successCount === iterations,
      message: `ok=${successCount}/${iterations} avg=${averageLatencyMs}ms thr=${result.throughputPerSec}/s`,
      durationMs: totalDurationMs,
      metrics: {
        successCount,
        failureCount,
        averageLatencyMs,
        throughputPerSec: result.throughputPerSec,
      },
    }),
  );
  if (failureCount > 0) errors.push(`Load testing failures: ${failureCount}`);

  return {
    result,
    suite: {
      suiteId: "load_testing",
      passed: errors.length === 0,
      cases,
      durationMs: totalDurationMs,
      errors,
      warnings,
    },
  };
}

export function runEaiPerformanceAggregateSuite(input: {
  latency?: EaiLatencyAnalysis;
  load?: EaiLoadTestResult;
  token?: EaiTokenOptimisationResult;
  context?: EaiContextOptimisationResult;
}): EaiValidationSuiteResult {
  const start = performance.now();
  const cases = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const latencyOk = input.latency?.withinBudget !== false;
  cases.push(
    caseResult({
      caseId: "perf.latency",
      suiteId: "performance",
      title: "Aggregate latency budget",
      ok: latencyOk,
      message: latencyOk ? "Latency within budget" : "Latency budget failed",
      durationMs: 0,
    }),
  );
  if (!latencyOk) errors.push("Performance: latency budget failed");

  const loadOk = (input.load?.failureCount ?? 0) === 0;
  cases.push(
    caseResult({
      caseId: "perf.load",
      suiteId: "performance",
      title: "Aggregate load success",
      ok: loadOk,
      message: loadOk ? "Load waves healthy" : "Load failures present",
      durationMs: 0,
    }),
  );
  if (!loadOk) errors.push("Performance: load failures");

  if (input.token && !input.token.optimised) {
    warnings.push("Token soft targets not fully met");
  }
  if (input.context && !input.context.withinBudget) {
    errors.push("Performance: context over budget");
  }

  cases.push(
    caseResult({
      caseId: "perf.context",
      suiteId: "performance",
      title: "Aggregate context budget",
      ok: input.context?.withinBudget !== false,
      message: input.context
        ? `${input.context.usedChars}/${input.context.budgetChars}`
        : "No context sample",
      durationMs: 0,
    }),
  );

  return {
    suiteId: "performance",
    passed: errors.length === 0,
    cases,
    durationMs: Math.round(performance.now() - start),
    errors,
    warnings,
  };
}
