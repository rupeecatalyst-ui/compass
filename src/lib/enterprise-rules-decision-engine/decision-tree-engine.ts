/**
 * ERDE decision tree engine.
 */

import { ERDE_RULE_LIFECYCLE_STATUS } from "@/constants/enterprise-rules-decision-engine";
import type {
  ErdeDecisionTree,
  ErdeRuleContext,
} from "@/types/enterprise-rules-decision-engine";
import { getErdePorts } from "./composition";
import { evaluateErdeCondition } from "./expression-evaluator";
import { validateErdeDecisionTree } from "./validation-engine";

function evaluateErdeTreeNode(
  tree: ErdeDecisionTree,
  nodeId: string,
  context: ErdeRuleContext,
): Record<string, unknown> | undefined {
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;

  if (node.isLeaf) {
    return node.output ?? {};
  }

  const matched = evaluateErdeCondition(
    {
      id: node.id,
      fieldRef: node.fieldRef!,
      operator: node.operator!,
      value: node.value,
    },
    context,
  );

  const nextId = matched ? node.trueChildId : node.falseChildId;
  if (!nextId) return undefined;

  return evaluateErdeTreeNode(tree, nextId, context);
}

export function evaluateErdeDecisionTree(input: {
  treeId: string;
  context: ErdeRuleContext;
}): { matched: boolean; output: Record<string, unknown> } {
  const tree = getErdePorts().decisionTrees.findById(input.treeId);
  if (!tree?.enabled) {
    throw new Error(`ERDE: decision tree "${input.treeId}" not found or disabled.`);
  }
  if (tree.lifecycleStatus !== ERDE_RULE_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`ERDE: decision tree "${tree.treeCode}" is not published.`);
  }

  const validation = validateErdeDecisionTree(tree);
  if (!validation.valid) {
    throw new Error("ERDE: decision tree validation failed.");
  }

  const output = evaluateErdeTreeNode(tree, tree.rootNodeId, input.context);
  return { matched: output !== undefined, output: output ?? {} };
}

export function publishErdeDecisionTree(treeId: string): ErdeDecisionTree | undefined {
  const tree = getErdePorts().decisionTrees.findById(treeId);
  if (!tree) return undefined;

  const validation = validateErdeDecisionTree(tree);
  if (!validation.valid) {
    throw new Error(validation.issues.map((i) => i.message).join("; "));
  }

  const updated: ErdeDecisionTree = {
    ...tree,
    lifecycleStatus: ERDE_RULE_LIFECYCLE_STATUS.PUBLISHED,
  };

  getErdePorts().decisionTrees.save(updated);
  return updated;
}
