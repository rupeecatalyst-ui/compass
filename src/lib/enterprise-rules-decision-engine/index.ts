export {
  configureErdePorts,
  getErdePorts,
  resetErdeComposition,
} from "./composition";

export { createInMemoryErdePorts } from "./repositories/in-memory";

export {
  evaluateErdeDecisionTable,
  publishErdeDecisionTable,
} from "./decision-table-engine";

export {
  evaluateErdeDecisionTree,
  publishErdeDecisionTree,
} from "./decision-tree-engine";

export {
  createErdeRuleVersion,
  getErdeRuleByCode,
  listErdeRules,
  listErdeRuleVersions,
  registerErdeDecisionTable,
  registerErdeDecisionTree,
  registerErdeRule,
  registerErdeRuleGroup,
  registerErdeRuleSet,
  transitionErdeRuleLifecycle,
  transitionErdeRuleVersionLifecycle,
} from "./rule-registry";

export {
  evaluateErdeRule,
  evaluateErdeRuleSet,
  listErdeExecutions,
} from "./rule-evaluator";

export {
  simulateErdeDecisionTable,
  simulateErdeDecisionTree,
  simulateErdeRule,
  simulateErdeRuleSet,
} from "./simulation-engine";

export {
  assertErdeRuleVersionValid,
  validateErdeDecisionTable,
  validateErdeDecisionTree,
  validateErdeLifecycleTransition,
  validateErdeRule,
  validateErdeRuleCodeUniqueness,
  validateErdeRuleVersion,
} from "./validation-engine";

export { getErdeFrameworkVersion, getErdeRegistrySnapshot } from "./registry-snapshot";
