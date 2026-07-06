import type { RuleCompositionEdge } from "@/types/rule-library";

/** Rule-to-rule composition graph — foundation for visualization & impact analysis. */
export const DEFAULT_RULE_COMPOSITION_EDGES: RuleCompositionEdge[] = [
  { id: "comp_001", ruleId: "rule_006", dependsOnRuleId: "rule_003" },
  { id: "comp_002", ruleId: "rule_006", dependsOnRuleId: "rule_001" },
  { id: "comp_003", ruleId: "rule_006", dependsOnRuleId: "rule_007" },
  { id: "comp_004", ruleId: "rule_006", dependsOnRuleId: "rule_008" },
  { id: "comp_005", ruleId: "rule_001", dependsOnRuleId: "rule_007" },
];
