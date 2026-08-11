/**
 * Enterprise AI Validation & Performance barrel (CO-AI-116).
 */

export {
  runEaiDomainBoundaryValidationSuite,
  runEaiPolicyGateValidationSuite,
} from "./domain-policy-suites";
export {
  analyzeEaiContextOptimisation,
  analyzeEaiLatency,
  analyzeEaiTokenOptimisation,
  runEaiLoadTestingSuite,
  runEaiPerformanceAggregateSuite,
} from "./performance-suites";
export { buildEaiPerformanceReport } from "./report";
export {
  runEaiValidationPerformanceReadiness,
  runEaiValidationPerformanceSuite,
} from "./readiness";
export {
  runEaiFailureRecoveryValidationSuite,
  runEaiPromptInjectionValidationSuite,
  runEaiSecurityValidationSuite,
} from "./security-recovery-suites";
export {
  runEaiBehaviourValidationSuite,
  runEaiContextValidationSuite,
  runEaiToolBusValidationSuite,
} from "./tool-context-behaviour-suites";
