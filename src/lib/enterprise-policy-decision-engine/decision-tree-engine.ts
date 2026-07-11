/**
 * EPDE decision tree engine.
 */

import { EPDE_POLICY_LIFECYCLE_STATUS } from "@/constants/enterprise-policy-decision-engine";
import type { EpdeDecisionTree, EpdePolicyContext } from "@/types/enterprise-policy-decision-engine";
import { getEpdePorts } from "./composition";
import { evaluateEpdeCondition } from "./expression-evaluator";
import { validateEpdeDecisionTree } from "./validation-engine";

function traverseEpdeTree(tree: EpdeDecisionTree, nodeId: string, context: EpdePolicyContext): Record<string, unknown> | undefined {
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return undefined;
  if (node.isLeaf) return node.output ?? {};

  const matched = evaluateEpdeCondition(
    { id: node.id, fieldRef: node.fieldRef!, operator: node.operator!, value: node.value },
    context,
  );
  const next = matched ? node.trueChildId : node.falseChildId;
  return next ? traverseEpdeTree(tree, next, context) : undefined;
}

export function evaluateEpdeDecisionTree(input: {
  treeId: string;
  context: EpdePolicyContext;
}): { matched: boolean; output: Record<string, unknown> } {
  const tree = getEpdePorts().decisionTrees.findById(input.treeId);
  if (!tree?.enabled) throw new Error(`EPDE: decision tree "${input.treeId}" not found.`);
  if (tree.lifecycleStatus !== EPDE_POLICY_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`EPDE: decision tree "${tree.treeCode}" is not published.`);
  }

  const validation = validateEpdeDecisionTree(tree);
  if (!validation.valid) throw new Error("EPDE: decision tree validation failed.");

  const output = traverseEpdeTree(tree, tree.rootNodeId, input.context);
  return { matched: output !== undefined, output: output ?? {} };
}
