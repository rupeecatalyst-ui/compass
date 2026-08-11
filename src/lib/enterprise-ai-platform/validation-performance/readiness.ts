/**
 * Enterprise AI Validation & Performance orchestrator (CO-AI-116).
 */

import { EAI_VALIDATION_PERFORMANCE_VERSION } from "@/constants/enterprise-ai-platform/validation-performance";
import type { EaiValidationPerformanceReadinessResult } from "@/types/enterprise-ai-validation-performance";
import {
  ensureEaiBehaviourPackScaffolds,
  resetEaiBehaviourPackRegistry,
} from "../behaviour-packs";
import { resetEaiComposition } from "../composition";
import { resetEaiConversationMemoryStore } from "../conversation-memory/store";
import {
  runEaiDomainBoundaryValidationSuite,
  runEaiPolicyGateValidationSuite,
} from "./domain-policy-suites";
import {
  analyzeEaiContextOptimisation,
  analyzeEaiLatency,
  analyzeEaiTokenOptimisation,
  runEaiLoadTestingSuite,
  runEaiPerformanceAggregateSuite,
} from "./performance-suites";
import { buildEaiPerformanceReport } from "./report";
import {
  runEaiFailureRecoveryValidationSuite,
  runEaiPromptInjectionValidationSuite,
  runEaiSecurityValidationSuite,
} from "./security-recovery-suites";
import {
  runEaiBehaviourValidationSuite,
  runEaiContextValidationSuite,
  runEaiToolBusValidationSuite,
} from "./tool-context-behaviour-suites";

export async function runEaiValidationPerformanceSuite(): Promise<EaiValidationPerformanceReadinessResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  resetEaiComposition();
  resetEaiBehaviourPackRegistry();
  ensureEaiBehaviourPackScaffolds();
  resetEaiConversationMemoryStore();

  const domain = runEaiDomainBoundaryValidationSuite();
  const policy = runEaiPolicyGateValidationSuite();
  const toolBus = runEaiToolBusValidationSuite();
  const context = await runEaiContextValidationSuite();
  const behaviour = await runEaiBehaviourValidationSuite();
  const promptInjection = await runEaiPromptInjectionValidationSuite();
  const security = await runEaiSecurityValidationSuite();
  const failureRecovery = await runEaiFailureRecoveryValidationSuite();

  const { analysis: latency, suite: latencySuite } = await analyzeEaiLatency();
  const { result: tokenOptimisation, suite: tokenSuite } = await analyzeEaiTokenOptimisation();
  const { result: contextOptimisation, suite: contextOptSuite } =
    await analyzeEaiContextOptimisation();
  const { result: loadTesting, suite: loadSuite } = await runEaiLoadTestingSuite();

  const performance = runEaiPerformanceAggregateSuite({
    latency,
    load: loadTesting,
    token: tokenOptimisation,
    context: contextOptimisation,
  });

  const suites = [
    domain,
    policy,
    toolBus,
    context,
    behaviour,
    promptInjection,
    security,
    failureRecovery,
    latencySuite,
    tokenSuite,
    contextOptSuite,
    loadSuite,
    performance,
  ];

  for (const s of suites) {
    errors.push(...s.errors.map((e) => `[${s.suiteId}] ${e}`));
    warnings.push(...s.warnings.map((w) => `[${s.suiteId}] ${w}`));
  }

  const report = buildEaiPerformanceReport({
    suites,
    latency,
    tokenOptimisation,
    contextOptimisation,
    loadTesting,
  });

  return {
    passed: errors.length === 0 && report.overallPassed,
    errors,
    warnings,
    details: {
      validationPerformanceVersion: EAI_VALIDATION_PERFORMANCE_VERSION,
      suiteCount: suites.length,
      failedSuites: suites.filter((s) => !s.passed).map((s) => s.suiteId),
      latencyP95Ms: latency.p95Ms,
      loadThroughputPerSec: loadTesting.throughputPerSec,
      estimatedOutputTokens: tokenOptimisation.estimatedOutputTokens,
      contextUsedChars: contextOptimisation.usedChars,
      securityFindingCount: report.securityFindings.length,
      reportId: report.reportId,
    },
    report,
    suites,
  };
}

/** Alias used by readiness scripts. */
export const runEaiValidationPerformanceReadiness = runEaiValidationPerformanceSuite;
