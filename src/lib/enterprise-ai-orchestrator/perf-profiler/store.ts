/**
 * CO-AI-G2-W7 — In-memory performance sample store.
 */

import type { EaoPerfSample } from "@/types/enterprise-ai-orchestrator/perf-profiler";

const MAX = 500;
const samples: EaoPerfSample[] = [];

export function saveEaoPerfSample(sample: EaoPerfSample): void {
  if (!sample.customerIsolated || !sample.runtimeUnoptimized) return;
  samples.unshift(sample);
  if (samples.length > MAX) samples.length = MAX;
}

export function listEaoPerfSamples(limit = 100): EaoPerfSample[] {
  return samples.slice(0, Math.max(0, limit));
}

export function clearEaoPerfSamples(): void {
  samples.length = 0;
}

export function countEaoPerfSamples(): number {
  return samples.length;
}
