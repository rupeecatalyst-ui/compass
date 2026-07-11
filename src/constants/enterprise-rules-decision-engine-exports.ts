export {
  evaluateErdeRule,
  getErdeFrameworkVersion,
  getErdeRegistrySnapshot,
  registerErdeRule,
  resetErdeComposition,
  simulateErdeRule,
  validateErdeRuleVersion,
} from "@/lib/enterprise-rules-decision-engine";

export {
  ERDE_FRAMEWORK_VERSION,
  ERDE_RULE_CATEGORIES,
  ERDE_RULE_LIFECYCLE_STATUS,
} from "@/constants/enterprise-rules-decision-engine";

export type {
  ErdeDecisionTable,
  ErdeDecisionTree,
  ErdeRegistrySnapshot,
  ErdeRule,
  ErdeRuleContext,
  ErdeRuleExecution,
  ErdeRuleResult,
  ErdeRuleSet,
  ErdeRuleVersion,
  ErdeValidationResult,
} from "@/types/enterprise-rules-decision-engine";
