/**
 * CO-ARCH-002-W6 — Performance validation (DAL vs direct local load).
 * Advisory only — Wave 6 delivery keeps flags OFF (same sync path).
 */
import { DEAL_CUTOVER_MONITORING } from "@/constants/enterprise-deal-registry";
import { loadDealsSync } from "@/lib/enterprise-deal/deal-data-access";
import { loadLoanFiles } from "@/lib/loan-files-storage";

export type DealPerformanceBenchmark = {
  at: string;
  iterations: number;
  directLoadAvgMs: number;
  dalLoadAvgMs: number;
  overheadMs: number;
  withinBudget: boolean;
  budgetMs: number;
  note: string;
};

function avgMs(samples: number[]): number {
  if (!samples.length) return 0;
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

export function runDealDalPerformanceBenchmark(iterations = 50): DealPerformanceBenchmark {
  const directSamples: number[] = [];
  const dalSamples: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    loadLoanFiles();
    directSamples.push(performance.now() - t0);

    const t1 = performance.now();
    loadDealsSync("loan_workspace");
    dalSamples.push(performance.now() - t1);
  }

  const directLoadAvgMs = avgMs(directSamples);
  const dalLoadAvgMs = avgMs(dalSamples);
  const overheadMs = Math.max(0, dalLoadAvgMs - directLoadAvgMs);
  const budgetMs = DEAL_CUTOVER_MONITORING.dalOverheadBudgetMs;

  return {
    at: new Date().toISOString(),
    iterations,
    directLoadAvgMs: Number(directLoadAvgMs.toFixed(4)),
    dalLoadAvgMs: Number(dalLoadAvgMs.toFixed(4)),
    overheadMs: Number(overheadMs.toFixed(4)),
    withinBudget: overheadMs <= budgetMs,
    budgetMs,
    note:
      "Flags OFF: DAL is a thin wrapper over loadLoanFiles (+ optional shadow queue). " +
      "API list p95 budget applies only after PORT_RUNTIME / consumer enablement.",
  };
}
