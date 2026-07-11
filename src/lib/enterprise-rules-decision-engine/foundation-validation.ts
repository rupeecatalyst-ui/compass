/**
 * ERDE foundation validation — smoke checks for Sprint 7 deliverable verification.
 */

import { ERDE_ACTION_KINDS, ERDE_EXPRESSION_OPERATORS, ERDE_RULE_CATEGORIES } from "@/constants/enterprise-rules-decision-engine";
import { getErdePorts, resetErdeComposition } from "./composition";
import { evaluateErdeDecisionTable, publishErdeDecisionTable } from "./decision-table-engine";
import { evaluateErdeDecisionTree, publishErdeDecisionTree } from "./decision-tree-engine";
import { getErdeRegistrySnapshot } from "./registry-snapshot";
import { evaluateErdeRule } from "./rule-evaluator";
import {
  createErdeRuleVersion,
  registerErdeDecisionTable,
  registerErdeDecisionTree,
  registerErdeRule,
  registerErdeRuleSet,
  transitionErdeRuleLifecycle,
  transitionErdeRuleVersionLifecycle,
} from "./rule-registry";
import { simulateErdeRule } from "./simulation-engine";
import { validateErdeRule, validateErdeRuleVersion } from "./validation-engine";

export function runErdeFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetErdeComposition();

  const conditionId = crypto.randomUUID();
  const expressionId = crypto.randomUUID();
  const actionId = crypto.randomUUID();
  const paramId = crypto.randomUUID();

  const rule = registerErdeRule({
    ruleCode: "ENTITY_STATUS_CHECK",
    ruleName: "Entity Status Check",
    description: "Generic status validation rule",
    category: ERDE_RULE_CATEGORIES.VALIDATION,
    priority: 10,
    tags: [{ id: crypto.randomUUID(), tagCode: "core", label: "Core" }],
    createdBy: "system",
  });

  const version = createErdeRuleVersion({
    ruleId: rule.id,
    ruleCode: rule.ruleCode,
    versionMajor: 1,
    versionMinor: 0,
    conditions: [
      {
        id: conditionId,
        fieldRef: "status",
        operator: ERDE_EXPRESSION_OPERATORS.EQUALS,
        value: "active",
      },
    ],
    expressions: [
      {
        id: expressionId,
        expressionCode: "STATUS_ACTIVE",
        operator: ERDE_EXPRESSION_OPERATORS.AND,
        conditionIds: [conditionId],
        childExpressionIds: [],
        enabled: true,
      },
    ],
    actions: [
      {
        id: actionId,
        actionCode: "EMIT_APPROVED",
        actionKind: ERDE_ACTION_KINDS.EMIT_RESULT,
        payload: { approved: true },
        enabled: true,
      },
    ],
    parameters: [
      {
        id: paramId,
        parameterCode: "status",
        parameterName: "Status",
        dataType: "string",
        required: true,
      },
    ],
    variables: [],
    rootExpressionId: expressionId,
    createdBy: "system",
    modifiedBy: "system",
  });

  const versionValidation = validateErdeRuleVersion(version);

  transitionErdeRuleVersionLifecycle({ versionId: version.id, action: "validate", actorId: "system" });
  transitionErdeRuleVersionLifecycle({ versionId: version.id, action: "approve", actorId: "system" });
  transitionErdeRuleVersionLifecycle({ versionId: version.id, action: "publish", actorId: "system" });
  transitionErdeRuleLifecycle({ ruleId: rule.id, action: "validate", actorId: "system" });
  transitionErdeRuleLifecycle({ ruleId: rule.id, action: "approve", actorId: "system" });
  transitionErdeRuleLifecycle({ ruleId: rule.id, action: "publish", actorId: "system" });

  const ruleSet = registerErdeRuleSet({
    setCode: "ENTITY_RULES",
    setName: "Entity Rules",
    description: "Entity validation rule set",
    category: ERDE_RULE_CATEGORIES.VALIDATION,
    ruleIds: [rule.id],
    enabled: true,
    createdBy: "system",
  });

  const inputColId = crypto.randomUUID();
  const outputColId = crypto.randomUUID();
  const table = registerErdeDecisionTable({
    tableCode: "STATUS_TABLE",
    tableName: "Status Table",
    description: "Status routing table",
    columns: [
      { id: inputColId, columnCode: "status", columnName: "Status", input: true, dataType: "string" },
      { id: outputColId, columnCode: "route", columnName: "Route", input: false, dataType: "string" },
    ],
    rows: [
      {
        id: crypto.randomUUID(),
        rowCode: "ACTIVE_ROW",
        priority: 1,
        inputs: { status: "active" },
        outputs: { route: "proceed" },
        enabled: true,
      },
    ],
    enabled: true,
    createdBy: "system",
  });
  publishErdeDecisionTable(table.id);

  const leafId = crypto.randomUUID();
  const rootId = crypto.randomUUID();
  const tree = registerErdeDecisionTree({
    treeCode: "STATUS_TREE",
    treeName: "Status Tree",
    description: "Status decision tree",
    rootNodeId: rootId,
    nodes: [
      {
        id: rootId,
        nodeCode: "ROOT",
        label: "Check Status",
        fieldRef: "status",
        operator: ERDE_EXPRESSION_OPERATORS.EQUALS,
        value: "active",
        trueChildId: leafId,
        isLeaf: false,
      },
      {
        id: leafId,
        nodeCode: "APPROVED",
        label: "Approved",
        isLeaf: true,
        output: { approved: true },
      },
    ],
    enabled: true,
    createdBy: "system",
  });
  publishErdeDecisionTree(tree.id);

  const executionId = crypto.randomUUID();
  const evalResult = evaluateErdeRule({
    ruleCode: rule.ruleCode,
    context: {
      executionId,
      variables: {},
      parameters: { status: "active" },
    },
    executedBy: "system",
  });

  const simResult = simulateErdeRule({
    ruleCode: rule.ruleCode,
    variables: {},
    parameters: { status: "inactive" },
    executedBy: "system",
  });

  const tableResult = evaluateErdeDecisionTable({
    tableId: table.id,
    context: { executionId: crypto.randomUUID(), variables: { status: "active" }, parameters: {} },
  });

  const treeResult = evaluateErdeDecisionTree({
    treeId: tree.id,
    context: { executionId: crypto.randomUUID(), variables: { status: "active" }, parameters: {} },
  });

  let rejectionChecks = 0;
  try {
    registerErdeRule({
      ruleCode: "ENTITY_STATUS_CHECK",
      ruleName: "Duplicate",
      description: "",
      category: ERDE_RULE_CATEGORIES.GENERAL,
      priority: 5,
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    createErdeRuleVersion({
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      versionMajor: 2,
      versionMinor: 0,
      conditions: [{ id: crypto.randomUUID(), fieldRef: "", operator: ERDE_EXPRESSION_OPERATORS.EQUALS, value: "x" }],
      expressions: [
        {
          id: crypto.randomUUID(),
          expressionCode: "BAD",
          operator: "invalid_op" as never,
          conditionIds: [],
          childExpressionIds: [],
          enabled: true,
        },
      ],
      actions: [],
      parameters: [],
      variables: [],
      rootExpressionId: crypto.randomUUID(),
      createdBy: "system",
      modifiedBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    const ruleA = registerErdeRule({
      ruleCode: "CIRCULAR_A",
      ruleName: "Circular A",
      description: "",
      category: ERDE_RULE_CATEGORIES.GENERAL,
      priority: 5,
      createdBy: "system",
    });
    const ruleB = registerErdeRule({
      ruleCode: "CIRCULAR_B",
      ruleName: "Circular B",
      description: "",
      category: ERDE_RULE_CATEGORIES.GENERAL,
      priority: 5,
      dependencyRuleIds: [ruleA.id],
      createdBy: "system",
    });
    const cycleCheck = validateErdeRule(getErdePorts().rules, {
      ...ruleA,
      dependencyRuleIds: [ruleB.id],
    });
    if (cycleCheck.issues.some((i) => i.code === "ERDE_CIRCULAR_REFERENCE")) rejectionChecks += 1;
  } catch {
    rejectionChecks += 1;
  }

  const snap = getErdeRegistrySnapshot();

  const passed =
    versionValidation.valid &&
    evalResult.matched &&
    !simResult.matched &&
    tableResult.matched &&
    treeResult.matched &&
    snap.rules.length >= 3 &&
    snap.versions.length === 1 &&
    snap.ruleSets.length === 1 &&
    snap.decisionTables.length === 1 &&
    snap.decisionTrees.length === 1 &&
    snap.executions.length >= 2 &&
    snap.auditReferences.length >= 5 &&
    rejectionChecks >= 3;

  return {
    passed,
    details: {
      ruleCode: rule.ruleCode,
      versionValid: versionValidation.valid,
      evalMatched: evalResult.matched,
      simMatched: simResult.matched,
      tableMatched: tableResult.matched,
      treeMatched: treeResult.matched,
      rules: snap.rules.length,
      executions: snap.executions.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
      ruleSetCode: ruleSet.setCode,
    },
  };
}
