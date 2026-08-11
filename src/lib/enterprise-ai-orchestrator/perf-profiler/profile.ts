/**
 * CO-AI-G2-W7 — Cost & Performance Profiler.
 * Records metrics and builds optimization reports — does not optimise runtime.
 */

import {
  EAO_PERF_DEFAULT_PRICE_PER_1K_TOKENS_USD,
  EAO_PERF_PROFILER_VERSION,
  type EaoPerfAggregateMetrics,
  type EaoPerfOptimizationItem,
  type EaoPerfProfilerReport,
  type EaoPerfProviderUsage,
  type EaoPerfSample,
} from "@/types/enterprise-ai-orchestrator/perf-profiler";

export function estimateTokensFromText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Rough enterprise heuristic: ~4 chars / token for mixed EN content
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function estimateCostUsd(input: {
  inputTokens: number;
  outputTokens: number;
  pricePer1kInputUsd?: number;
  pricePer1kOutputUsd?: number;
}): number {
  const inRate = input.pricePer1kInputUsd ?? EAO_PERF_DEFAULT_PRICE_PER_1K_TOKENS_USD.input;
  const outRate = input.pricePer1kOutputUsd ?? EAO_PERF_DEFAULT_PRICE_PER_1K_TOKENS_USD.output;
  const cost =
    (input.inputTokens / 1000) * inRate + (input.outputTokens / 1000) * outRate;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function createEaoPerfSample(input: {
  latencyMs: number;
  providerLatencyMs?: number;
  inputText?: string;
  outputText?: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  toolCallCount?: number;
  contextSizeChars?: number;
  memorySizeChars?: number;
  providerId: string;
  providerConfigVersion?: string;
  shadowId?: string;
  sessionId?: string;
  conversationId?: string;
  label?: string;
}): EaoPerfSample {
  const estimatedInputTokens =
    input.estimatedInputTokens ?? estimateTokensFromText(input.inputText ?? "");
  const estimatedOutputTokens =
    input.estimatedOutputTokens ?? estimateTokensFromText(input.outputText ?? "");
  const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
  const estimatedCostUsd = estimateCostUsd({
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
  });

  return {
    sampleId: `eao_perf_${crypto.randomUUID()}`,
    recordedAt: new Date().toISOString(),
    latencyMs: Math.max(0, input.latencyMs),
    providerLatencyMs: input.providerLatencyMs,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens,
    estimatedCostUsd,
    toolCallCount: input.toolCallCount ?? 0,
    contextSizeChars: input.contextSizeChars ?? 0,
    memorySizeChars: input.memorySizeChars ?? 0,
    providerId: input.providerId,
    providerConfigVersion: input.providerConfigVersion,
    shadowId: input.shadowId,
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    label: input.label,
    runtimeUnoptimized: true,
    customerIsolated: true,
  };
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
}

function p95(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

export function aggregateEaoPerfSamples(samples: EaoPerfSample[]): EaoPerfAggregateMetrics {
  const providerMap = new Map<string, EaoPerfProviderUsage>();
  for (const s of samples) {
    const key = s.providerId;
    const cur = providerMap.get(key) ?? {
      providerId: s.providerId,
      configVersion: s.providerConfigVersion,
      invocationCount: 0,
      totalLatencyMs: 0,
      totalEstimatedTokens: 0,
      totalEstimatedCostUsd: 0,
    };
    cur.invocationCount += 1;
    cur.totalLatencyMs += s.latencyMs;
    cur.totalEstimatedTokens += s.estimatedTotalTokens;
    cur.totalEstimatedCostUsd += s.estimatedCostUsd;
    if (s.providerConfigVersion) cur.configVersion = s.providerConfigVersion;
    providerMap.set(key, cur);
  }

  const latencies = samples.map((s) => s.latencyMs);
  const tokens = samples.map((s) => s.estimatedTotalTokens);
  const inTok = samples.map((s) => s.estimatedInputTokens);
  const outTok = samples.map((s) => s.estimatedOutputTokens);
  const tools = samples.map((s) => s.toolCallCount);
  const ctx = samples.map((s) => s.contextSizeChars);
  const mem = samples.map((s) => s.memorySizeChars);
  const costs = samples.map((s) => s.estimatedCostUsd);

  return {
    sampleCount: samples.length,
    averageResponseTimeMs: average(latencies),
    averageLatencyMs: average(latencies),
    averageTokens: average(tokens),
    averageInputTokens: average(inTok),
    averageOutputTokens: average(outTok),
    estimatedCostUsdTotal:
      Math.round(costs.reduce((s, n) => s + n, 0) * 1_000_000) / 1_000_000,
    estimatedCostUsdAverage: average(costs),
    averageToolCalls: average(tools),
    averageContextSizeChars: average(ctx),
    averageMemorySizeChars: average(mem),
    p95LatencyMs: p95(latencies),
    providerUsage: [...providerMap.values()],
  };
}

export function buildEaoPerfOptimizations(
  metrics: EaoPerfAggregateMetrics,
): EaoPerfOptimizationItem[] {
  const items: EaoPerfOptimizationItem[] = [];

  if (metrics.sampleCount === 0) {
    items.push({
      area: "Coverage",
      severity: "info",
      observation: "No profiler samples recorded yet",
      recommendation: "Enable Shadow Mode in BAT to collect cost/latency samples",
    });
    return items;
  }

  if (metrics.averageLatencyMs > 2500 || metrics.p95LatencyMs > 4000) {
    items.push({
      area: "Latency",
      severity: "high",
      observation: `Avg ${metrics.averageLatencyMs}ms · p95 ${metrics.p95LatencyMs}ms`,
      recommendation:
        "Future: stream tokens, shrink context, and parallelise independent tool reads (not applied in W7)",
    });
  } else if (metrics.averageLatencyMs > 1200) {
    items.push({
      area: "Latency",
      severity: "warn",
      observation: `Avg response time ${metrics.averageLatencyMs}ms`,
      recommendation: "Monitor provider latency; consider lighter prompts for simple turns later",
    });
  } else {
    items.push({
      area: "Latency",
      severity: "info",
      observation: `Avg latency ${metrics.averageLatencyMs}ms within early target band`,
      recommendation: "Keep measuring under real provider load before Hybrid",
    });
  }

  if (metrics.averageTokens > 2500) {
    items.push({
      area: "Tokens",
      severity: "warn",
      observation: `Average tokens ${metrics.averageTokens}`,
      recommendation: "Reduce history window and dedupe context facts (Context Quality W5)",
    });
  } else {
    items.push({
      area: "Tokens",
      severity: "info",
      observation: `Average tokens ${metrics.averageTokens}`,
      recommendation: "Maintain token budgets in Orchestrator request assembly",
    });
  }

  if (metrics.estimatedCostUsdAverage > 0.02) {
    items.push({
      area: "Cost",
      severity: "warn",
      observation: `Avg estimated cost $${metrics.estimatedCostUsdAverage} / turn`,
      recommendation: "Route simple turns to cheaper models once provider abstraction is live",
    });
  } else {
    items.push({
      area: "Cost",
      severity: "info",
      observation: `Avg estimated cost $${metrics.estimatedCostUsdAverage} / turn (heuristic pricing)`,
      recommendation: "Replace heuristic rates with provider invoices when available",
    });
  }

  if (metrics.averageToolCalls > 4) {
    items.push({
      area: "Tool Calls",
      severity: "warn",
      observation: `Average tool calls ${metrics.averageToolCalls}`,
      recommendation: "Batch read-only tools and cache registry snapshots per session",
    });
  } else {
    items.push({
      area: "Tool Calls",
      severity: "info",
      observation: `Average tool calls ${metrics.averageToolCalls}`,
      recommendation: "Keep propose-only side effects; prefer compute_only engines",
    });
  }

  if (metrics.averageContextSizeChars > 12_000) {
    items.push({
      area: "Context Size",
      severity: "high",
      observation: `Avg context ${metrics.averageContextSizeChars} chars`,
      recommendation: "Apply Context Quality Analyzer optimizations before Hybrid",
    });
  } else if (metrics.averageContextSizeChars < 200 && metrics.sampleCount > 0) {
    items.push({
      area: "Context Size",
      severity: "warn",
      observation: `Avg context ${metrics.averageContextSizeChars} chars looks sparse`,
      recommendation: "Ensure Read Connectors populate required product facts",
    });
  } else {
    items.push({
      area: "Context Size",
      severity: "info",
      observation: `Avg context ${metrics.averageContextSizeChars} chars`,
      recommendation: "Continue freshness + relevance checks (W5)",
    });
  }

  if (metrics.averageMemorySizeChars > 8_000) {
    items.push({
      area: "Memory Size",
      severity: "warn",
      observation: `Avg memory payload ${metrics.averageMemorySizeChars} chars`,
      recommendation: "Prune pending write intents and compact knownFacts",
    });
  } else {
    items.push({
      area: "Memory Size",
      severity: "info",
      observation: `Avg memory payload ${metrics.averageMemorySizeChars} chars`,
      recommendation: "Keep consultation memory distinct from CRM SSOT",
    });
  }

  if (metrics.providerUsage.length > 1) {
    items.push({
      area: "Provider Usage",
      severity: "info",
      observation: `${metrics.providerUsage.length} providers observed`,
      recommendation: "Compare cost/latency by provider before selecting production default",
    });
  } else if (metrics.providerUsage[0]) {
    items.push({
      area: "Provider Usage",
      severity: "info",
      observation: `Dominant provider ${metrics.providerUsage[0].providerId} (${metrics.providerUsage[0].invocationCount} calls)`,
      recommendation: "Keep provider swappable via EaoModelProviderPort",
    });
  }

  return items;
}

export function buildEaoPerfProfilerReport(input: {
  title: string;
  samples: EaoPerfSample[];
}): EaoPerfProfilerReport {
  const metrics = aggregateEaoPerfSamples(input.samples);
  return {
    reportId: `eao_perf_report_${crypto.randomUUID()}`,
    version: EAO_PERF_PROFILER_VERSION,
    title: input.title,
    metrics,
    optimizations: buildEaoPerfOptimizations(metrics),
    generatedAt: new Date().toISOString(),
    runtimeUnoptimized: true,
    customerIsolated: true,
  };
}
