/**
 * Shared timing helpers (CO-AI-116).
 */

import type {
  EaiValidationCaseResult,
  EaiValidationSuiteId,
} from "@/types/enterprise-ai-validation-performance";

export async function timeEaiAsync<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, durationMs: Math.round(performance.now() - start) };
}

export function timeEaiSync<T>(fn: () => T): { result: T; durationMs: number } {
  const start = performance.now();
  const result = fn();
  return { result, durationMs: Math.round(performance.now() - start) };
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

export function caseResult(input: {
  caseId: string;
  suiteId: EaiValidationSuiteId;
  title: string;
  ok: boolean;
  message: string;
  durationMs: number;
  warning?: boolean;
  metrics?: Record<string, number | string | boolean>;
}): EaiValidationCaseResult {
  return {
    caseId: input.caseId,
    suiteId: input.suiteId,
    title: input.title,
    status: input.ok ? (input.warning ? "warning" : "passed") : "failed",
    message: input.message,
    durationMs: input.durationMs,
    metrics: input.metrics,
  };
}
