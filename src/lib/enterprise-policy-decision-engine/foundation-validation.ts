/**
 * EPDE foundation validation — smoke checks for Sprint 7 deliverable verification.
 */

import { EPDE_CONFLICT_STRATEGIES, EPDE_POLICY_CATEGORIES, EPDE_SCOPE_TYPES } from "@/constants/enterprise-policy-decision-engine";
import { getEpdePorts, resetEpdeComposition } from "./composition";
import { evaluateEpdeDecisionMatrix, evaluateEpdeScoringModel } from "./decision-matrix-engine";
import { evaluateEpdeDecisionTable } from "./decision-table-engine";
import { evaluateEpdeDecisionTree } from "./decision-tree-engine";
import { getEpdeRegistrySnapshot } from "./registry-snapshot";
import { evaluateEpdePolicy } from "./policy-evaluator";
import {
  createEpdePolicyVersion,
  publishEpdeArtifact,
  registerEpdeDecisionMatrix,
  registerEpdeDecisionTable,
  registerEpdeDecisionTree,
  registerEpdePolicy,
  registerEpdePolicyGroup,
  registerEpdeScoringModel,
  transitionEpdePolicyLifecycle,
  transitionEpdePolicyVersionLifecycle,
} from "./policy-registry";
import { runEpdeWhatIfAnalysis, simulateEpdePolicy } from "./simulation-engine";
import { validateEpdePolicy, validateEpdePolicyVersion } from "./validation-engine";

export function runEpdeFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEpdeComposition();

  const buildVersion = (policyId: string, policyCode: string, disposition: "allow" | "deny") => {
    const localConditionId = crypto.randomUUID();
    const localExpressionId = crypto.randomUUID();
    const localOutcomeId = crypto.randomUUID();
    return createEpdePolicyVersion({
      policyId,
      policyCode,
      versionMajor: 1,
      versionMinor: 0,
      conditions: [{
        id: localConditionId,
        fieldRef: "role",
        operator: "equals",
        value: "user",
      }],
      expressions: [{
        id: localExpressionId,
        expressionCode: "ROLE_CHECK",
        operator: "and",
        conditionIds: [localConditionId],
        childExpressionIds: [],
        enabled: true,
      }],
      actions: [{
        id: crypto.randomUUID(),
        actionCode: "SET_OUTCOME",
        actionKind: "set_outcome",
        payload: { outcomeCode: disposition.toUpperCase() },
        enabled: true,
      }],
      variables: [{ id: crypto.randomUUID(), variableCode: "role", variableName: "Role", dataType: "string", required: true }],
      outcomes: [{
        id: localOutcomeId,
        outcomeCode: disposition.toUpperCase(),
        label: disposition,
        disposition,
      }],
      rootExpressionId: localExpressionId,
      createdBy: "system",
      modifiedBy: "system",
    });
  };

  const allowPolicy = registerEpdePolicy({
    policyCode: "ACCESS_ALLOW",
    policyName: "Access Allow",
    description: "Generic allow policy",
    category: EPDE_POLICY_CATEGORIES.ACCESS,
    priority: 10,
    scopes: [{ id: crypto.randomUUID(), scopeType: EPDE_SCOPE_TYPES.GLOBAL, scopeRef: "*", label: "Global" }],
    createdBy: "system",
  });

  const denyPolicy = registerEpdePolicy({
    policyCode: "ACCESS_DENY",
    policyName: "Access Deny",
    description: "Generic deny policy",
    category: EPDE_POLICY_CATEGORIES.ACCESS,
    priority: 20,
    scopes: [{ id: crypto.randomUUID(), scopeType: EPDE_SCOPE_TYPES.GLOBAL, scopeRef: "*", label: "Global" }],
    createdBy: "system",
  });

  const allowVersion = buildVersion(allowPolicy.id, allowPolicy.policyCode, "allow");
  const denyVersion = buildVersion(denyPolicy.id, denyPolicy.policyCode, "deny");

  validateEpdePolicyVersion(allowVersion);

  for (const v of [allowVersion, denyVersion]) {
    transitionEpdePolicyVersionLifecycle({ versionId: v.id, action: "validate", actorId: "system" });
    transitionEpdePolicyVersionLifecycle({ versionId: v.id, action: "approve", actorId: "system" });
    transitionEpdePolicyVersionLifecycle({ versionId: v.id, action: "publish", actorId: "system" });
  }

  for (const p of [allowPolicy, denyPolicy]) {
    transitionEpdePolicyLifecycle({ policyId: p.id, action: "validate", actorId: "system" });
    transitionEpdePolicyLifecycle({ policyId: p.id, action: "approve", actorId: "system" });
    transitionEpdePolicyLifecycle({ policyId: p.id, action: "publish", actorId: "system" });
  }

  const group = registerEpdePolicyGroup({
    groupCode: "ACCESS_POLICIES",
    groupName: "Access Policies",
    description: "Access policy group",
    policyIds: [allowPolicy.id, denyPolicy.id],
    priority: 1,
    conflictResolution: EPDE_CONFLICT_STRATEGIES.DENY_OVERRIDES,
    enabled: true,
    createdBy: "system",
  });

  const table = registerEpdeDecisionTable({
    tableCode: "ROLE_TABLE",
    tableName: "Role Table",
    columns: [
      { id: crypto.randomUUID(), columnCode: "role", columnName: "Role", input: true, dataType: "string" },
      { id: crypto.randomUUID(), columnCode: "access", columnName: "Access", input: false, dataType: "string" },
    ],
    rows: [{ id: crypto.randomUUID(), rowCode: "USER", priority: 1, inputs: { role: "user" }, outputs: { access: "granted" }, enabled: true }],
    enabled: true,
    createdBy: "system",
  });
  publishEpdeArtifact("decision_table", table.id);

  const leafId = crypto.randomUUID();
  const rootId = crypto.randomUUID();
  const tree = registerEpdeDecisionTree({
    treeCode: "ROLE_TREE",
    treeName: "Role Tree",
    rootNodeId: rootId,
    nodes: [
      { id: rootId, nodeCode: "ROOT", label: "Role", fieldRef: "role", operator: "equals", value: "user", trueChildId: leafId, isLeaf: false },
      { id: leafId, nodeCode: "GRANT", label: "Grant", isLeaf: true, output: { access: "granted" } },
    ],
    enabled: true,
    createdBy: "system",
  });
  publishEpdeArtifact("decision_tree", tree.id);

  const matrix = registerEpdeDecisionMatrix({
    matrixCode: "ROLE_MATRIX",
    matrixName: "Role Matrix",
    rowKeys: ["user"],
    columnKeys: ["read"],
    cells: [{ id: crypto.randomUUID(), rowKey: "user", columnKey: "read", value: "yes", output: { permitted: true } }],
    enabled: true,
    createdBy: "system",
  });
  publishEpdeArtifact("decision_matrix", matrix.id);

  const scoring = registerEpdeScoringModel({
    modelCode: "RISK_SCORE",
    modelName: "Risk Score",
    criteria: [{ id: crypto.randomUUID(), criterionCode: "score", fieldRef: "score", weight: 1, maxScore: 100, enabled: true }],
    passThreshold: 50,
    enabled: true,
    createdBy: "system",
  });
  publishEpdeArtifact("scoring_model", scoring.id);

  const evalResult = evaluateEpdePolicy({
    policyCode: allowPolicy.policyCode,
    context: { executionId: crypto.randomUUID(), variables: {}, parameters: { role: "user" }, scopeRefs: ["*"] },
    executedBy: "system",
  });

  const simResult = simulateEpdePolicy({
    policyCode: denyPolicy.policyCode,
    variables: {},
    parameters: { role: "user" },
    scopeRefs: ["*"],
    executedBy: "system",
  });

  const whatIf = runEpdeWhatIfAnalysis({
    groupCode: group.groupCode,
    variables: {},
    parameters: { role: "user" },
    scopeRefs: ["*"],
    executedBy: "system",
    autoResolveConflicts: true,
  });

  const tableResult = evaluateEpdeDecisionTable({
    tableId: table.id,
    context: { executionId: crypto.randomUUID(), variables: { role: "user" }, parameters: {} },
  });

  const treeResult = evaluateEpdeDecisionTree({
    treeId: tree.id,
    context: { executionId: crypto.randomUUID(), variables: { role: "user" }, parameters: {} },
  });

  const matrixResult = evaluateEpdeDecisionMatrix({ matrixId: matrix.id, rowKey: "user", columnKey: "read" });
  const scoreResult = evaluateEpdeScoringModel({
    modelId: scoring.id,
    context: { executionId: crypto.randomUUID(), variables: { score: 75 }, parameters: {} },
  });

  let rejectionChecks = 0;
  try {
    registerEpdePolicy({
      policyCode: "ACCESS_ALLOW",
      policyName: "Dup",
      description: "",
      category: EPDE_POLICY_CATEGORIES.GENERAL,
      priority: 5,
      scopes: [],
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    createEpdePolicyVersion({
      policyId: allowPolicy.id,
      policyCode: allowPolicy.policyCode,
      versionMajor: 2,
      versionMinor: 0,
      conditions: [{ id: crypto.randomUUID(), fieldRef: "", operator: "equals", value: "x" }],
      expressions: [{ id: crypto.randomUUID(), expressionCode: "BAD", operator: "invalid_op" as never, conditionIds: [], childExpressionIds: [], enabled: true }],
      actions: [],
      variables: [],
      outcomes: [],
      rootExpressionId: crypto.randomUUID(),
      createdBy: "system",
      modifiedBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    const a = registerEpdePolicy({
      policyCode: "CIRC_A",
      policyName: "A",
      description: "",
      category: EPDE_POLICY_CATEGORIES.GENERAL,
      priority: 5,
      scopes: [{ id: crypto.randomUUID(), scopeType: EPDE_SCOPE_TYPES.GLOBAL, scopeRef: "*", label: "G" }],
      createdBy: "system",
    });
    const b = registerEpdePolicy({
      policyCode: "CIRC_B",
      policyName: "B",
      description: "",
      category: EPDE_POLICY_CATEGORIES.GENERAL,
      priority: 5,
      scopes: [{ id: crypto.randomUUID(), scopeType: EPDE_SCOPE_TYPES.GLOBAL, scopeRef: "*", label: "G" }],
      dependencyPolicyIds: [a.id],
      createdBy: "system",
    });
    const cycle = validateEpdePolicy(getEpdePorts().policies, { ...a, dependencyPolicyIds: [b.id] });
    if (cycle.issues.some((i) => i.code === "EPDE_CIRCULAR_REFERENCE")) rejectionChecks += 1;
  } catch {
    rejectionChecks += 1;
  }

  const snap = getEpdeRegistrySnapshot();

  const passed =
    evalResult.matched &&
    simResult.results[0]?.matched &&
    whatIf.conflicts.length >= 1 &&
    whatIf.resolutions.length >= 1 &&
    tableResult.matched &&
    treeResult.matched &&
    matrixResult.matched &&
    scoreResult.passed &&
    snap.policies.length >= 4 &&
    snap.versions.length === 2 &&
    snap.conflicts.length >= 1 &&
    snap.resolutions.length >= 1 &&
    snap.simulations.length >= 3 &&
    snap.auditReferences.length >= 5 &&
    rejectionChecks >= 3;

  return {
    passed,
    details: {
      evalMatched: evalResult.matched,
      conflicts: whatIf.conflicts.length,
      resolutions: whatIf.resolutions.length,
      tableMatched: tableResult.matched,
      treeMatched: treeResult.matched,
      matrixMatched: matrixResult.matched,
      scorePassed: scoreResult.passed,
      policies: snap.policies.length,
      simulations: snap.simulations.length,
      auditReferences: snap.auditReferences.length,
      rejectionChecks,
    },
  };
}
