/**
 * CO-AI-G2-W7 — Cost & Performance Profiler types.
 * Metrics + optimization reports only — no runtime optimisation.
 */

export const EAO_PERF_PROFILER_VERSION = "1.0.0-g2-w7" as const;

/** Default USD pricing assumptions for estimation (configurable). */
export const EAO_PERF_DEFAULT_PRICE_PER_1K_TOKENS_USD = {
  input: 0.0005,
  output: 0.0015,
} as const;

export interface EaoPerfProviderUsage {
  providerId: string;
  configVersion?: string;
  invocationCount: number;
  totalLatencyMs: number;
  totalEstimatedTokens: number;
  totalEstimatedCostUsd: number;
}

export interface EaoPerfSample {
  sampleId: string;
  recordedAt: string;
  /** End-to-end shadow/reasoning latency */
  latencyMs: number;
  /** Provider round-trip if measured separately */
  providerLatencyMs?: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedCostUsd: number;
  toolCallCount: number;
  contextSizeChars: number;
  memorySizeChars: number;
  providerId: string;
  providerConfigVersion?: string;
  shadowId?: string;
  sessionId?: string;
  conversationId?: string;
  label?: string;
  /** Profiler never tunes runtime */
  runtimeUnoptimized: true;
  customerIsolated: true;
}

export interface EaoPerfAggregateMetrics {
  sampleCount: number;
  averageResponseTimeMs: number;
  averageLatencyMs: number;
  averageTokens: number;
  averageInputTokens: number;
  averageOutputTokens: number;
  estimatedCostUsdTotal: number;
  estimatedCostUsdAverage: number;
  averageToolCalls: number;
  averageContextSizeChars: number;
  averageMemorySizeChars: number;
  p95LatencyMs: number;
  providerUsage: EaoPerfProviderUsage[];
}

export interface EaoPerfOptimizationItem {
  area: string;
  severity: "info" | "warn" | "high";
  observation: string;
  recommendation: string;
}

export interface EaoPerfProfilerReport {
  reportId: string;
  version: typeof EAO_PERF_PROFILER_VERSION;
  title: string;
  metrics: EaoPerfAggregateMetrics;
  optimizations: EaoPerfOptimizationItem[];
  generatedAt: string;
  runtimeUnoptimized: true;
  customerIsolated: true;
}
