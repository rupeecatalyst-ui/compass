/**
 * Performance report builder (CO-AI-116).
 */

import { EAI_FRAMEWORK_VERSION } from "@/constants/enterprise-ai-platform";
import { EAI_VALIDATION_PERFORMANCE_VERSION } from "@/constants/enterprise-ai-platform/validation-performance";
import type {
  EaiContextOptimisationResult,
  EaiLatencyAnalysis,
  EaiLoadTestResult,
  EaiPerformanceReportSnapshot,
  EaiTokenOptimisationResult,
  EaiValidationSuiteResult,
} from "@/types/enterprise-ai-validation-performance";

export function buildEaiPerformanceReport(input: {
  suites: EaiValidationSuiteResult[];
  latency?: EaiLatencyAnalysis;
  tokenOptimisation?: EaiTokenOptimisationResult;
  contextOptimisation?: EaiContextOptimisationResult;
  loadTesting?: EaiLoadTestResult;
}): EaiPerformanceReportSnapshot {
  const recommendations: string[] = [
    ...EAI_VALIDATION_DISCLAIMERS_SAFE(),
  ];
  const securityFindings: string[] = [];

  for (const suite of input.suites) {
    for (const c of suite.cases.filter((x) => x.status === "failed")) {
      if (suite.suiteId === "security" || suite.suiteId === "prompt_injection") {
        securityFindings.push(`${c.caseId}: ${c.message}`);
      }
    }
    recommendations.push(...suite.warnings.map((w) => `[${suite.suiteId}] ${w}`));
  }

  if (input.tokenOptimisation) {
    recommendations.push(...input.tokenOptimisation.recommendations);
  }
  if (input.contextOptimisation) {
    recommendations.push(...input.contextOptimisation.recommendations);
  }

  const overallPassed = input.suites.every((s) => s.passed);

  return {
    reportId: `eai_perf_${crypto.randomUUID()}`,
    generatedAt: new Date().toISOString(),
    frameworkVersion: EAI_FRAMEWORK_VERSION,
    engineVersion: EAI_VALIDATION_PERFORMANCE_VERSION,
    overallPassed,
    suiteSummaries: input.suites.map((s) => ({
      suiteId: s.suiteId,
      passed: s.passed,
      caseCount: s.cases.length,
      failedCount: s.cases.filter((c) => c.status === "failed").length,
      warningCount: s.cases.filter((c) => c.status === "warning").length + s.warnings.length,
      durationMs: s.durationMs,
    })),
    latency: input.latency,
    tokenOptimisation: input.tokenOptimisation,
    contextOptimisation: input.contextOptimisation,
    loadTesting: input.loadTesting,
    securityFindings,
    recommendations: [...new Set(recommendations)].slice(0, 40),
  };
}

function EAI_VALIDATION_DISCLAIMERS_SAFE(): string[] {
  return [
    "Validation harness does not modify enterprise rules.",
    "Latency budgets assume stub LLM providers.",
    "Token estimates are heuristic (chars/4).",
  ];
}
