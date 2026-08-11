/**
 * CO-AI-G2-W4 — In-memory triple comparison store (internal evaluation).
 */

import type { EaoTripleComparisonResult } from "@/types/enterprise-ai-orchestrator/triple-comparison";

const MAX = 200;
const records: EaoTripleComparisonResult[] = [];

export function saveEaoTripleComparison(result: EaoTripleComparisonResult): void {
  if (!result.customerIsolated) return;
  records.unshift(result);
  if (records.length > MAX) records.length = MAX;
}

export function listEaoTripleComparisons(limit = 50): EaoTripleComparisonResult[] {
  return records.slice(0, Math.max(0, limit));
}

export function clearEaoTripleComparisons(): void {
  records.length = 0;
}

export function countEaoTripleComparisons(): number {
  return records.length;
}
