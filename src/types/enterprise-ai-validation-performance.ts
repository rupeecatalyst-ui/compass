/**
 * Enterprise AI Validation & Performance types (CO-AI-116 / Sprint AI-16).
 * Platform-wide validation harness — does not modify enterprise rules or engines.
 */

export type EaiValidationSuiteId =
  | "performance"
  | "latency"
  | "token_optimisation"
  | "context_optimisation"
  | "load_testing"
  | "failure_recovery"
  | "security"
  | "prompt_injection"
  | "domain_boundary"
  | "policy_gate"
  | "tool_bus"
  | "context"
  | "behaviour";

export type EaiValidationCaseStatus = "passed" | "failed" | "warning" | "skipped";

export interface EaiValidationCaseResult {
  caseId: string;
  suiteId: EaiValidationSuiteId;
  title: string;
  status: EaiValidationCaseStatus;
  message: string;
  durationMs: number;
  metrics?: Record<string, number | string | boolean>;
}

export interface EaiValidationSuiteResult {
  suiteId: EaiValidationSuiteId;
  passed: boolean;
  cases: EaiValidationCaseResult[];
  durationMs: number;
  errors: string[];
  warnings: string[];
}

export interface EaiLatencySample {
  operation: string;
  durationMs: number;
}

export interface EaiLatencyAnalysis {
  samples: EaiLatencySample[];
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  averageMs: number;
  withinBudget: boolean;
  budgetMs: number;
}

export interface EaiTokenOptimisationResult {
  approximateInputChars: number;
  approximateOutputChars: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  recommendations: string[];
  optimised: boolean;
}

export interface EaiContextOptimisationResult {
  budgetChars: number;
  usedChars: number;
  truncated: boolean;
  domainsIncluded: string[];
  recommendations: string[];
  withinBudget: boolean;
}

export interface EaiLoadTestResult {
  concurrency: number;
  iterations: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  throughputPerSec: number;
  averageLatencyMs: number;
}

export interface EaiPerformanceReportSnapshot {
  reportId: string;
  generatedAt: string;
  frameworkVersion: string;
  engineVersion: string;
  overallPassed: boolean;
  suiteSummaries: Array<{
    suiteId: EaiValidationSuiteId;
    passed: boolean;
    caseCount: number;
    failedCount: number;
    warningCount: number;
    durationMs: number;
  }>;
  latency?: EaiLatencyAnalysis;
  tokenOptimisation?: EaiTokenOptimisationResult;
  contextOptimisation?: EaiContextOptimisationResult;
  loadTesting?: EaiLoadTestResult;
  securityFindings: string[];
  recommendations: string[];
}

export interface EaiValidationPerformanceReadinessResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
  report: EaiPerformanceReportSnapshot;
  suites: EaiValidationSuiteResult[];
}
