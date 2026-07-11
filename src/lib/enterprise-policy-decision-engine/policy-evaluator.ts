/**
 * EPDE policy evaluator.
 */

import { EPDE_POLICY_LIFECYCLE_STATUS } from "@/constants/enterprise-policy-decision-engine";
import type {
  EpdeEvaluationResult,
  EpdePolicy,
  EpdePolicyContext,
  EpdePolicyVersion,
  EpdeSimulationResult,
} from "@/types/enterprise-policy-decision-engine";
import { recordEpdePolicyAudit } from "./audit-integration";
import { getEpdePorts } from "./composition";
import { evaluateEpdeExpression } from "./expression-evaluator";
import {
  getEpdePublishedVersion,
  isEpdePolicyEffective,
  validateEpdeEvaluationContext,
} from "./validation-engine";

function applyEpdeInheritance(policy: EpdePolicy, context: EpdePolicyContext): EpdePolicyContext {
  if (!policy.parentPolicyId) return context;
  const parent = getEpdePorts().policies.findById(policy.parentPolicyId);
  if (!parent) return context;
  const parentVersion = getEpdePublishedVersion(parent.id);
  if (!parentVersion) return context;
  const parentResult = evaluateEpdePolicyInternal(parent, parentVersion, context);
  return { ...context, variables: { ...context.variables, ...parentResult.output } };
}

function matchesEpdeScope(policy: EpdePolicy, context: EpdePolicyContext): boolean {
  if (policy.scopes.length === 0) return true;
  const refs = context.scopeRefs ?? [];
  return policy.scopes.some((s) => refs.includes(s.scopeRef) || s.scopeType === "global");
}

function executeEpdeActions(
  version: EpdePolicyVersion,
  matched: boolean,
): { output: Record<string, unknown>; outcome?: EpdePolicyVersion["outcomes"][number]; chainedPolicyIds: string[]; messages: string[] } {
  const output: Record<string, unknown> = {};
  const chainedPolicyIds: string[] = [];
  const messages: string[] = [];
  let outcome: EpdePolicyVersion["outcomes"][number] | undefined;

  if (!matched) return { output, chainedPolicyIds, messages };

  for (const action of version.actions.filter((a) => a.enabled)) {
    switch (action.actionKind) {
      case "set_outcome": {
        const code = String(action.payload?.outcomeCode ?? action.targetRef ?? "");
        outcome = version.outcomes.find((o) => o.outcomeCode === code);
        if (action.payload) Object.assign(output, action.payload);
        break;
      }
      case "chain_policy":
        if (action.targetRef) chainedPolicyIds.push(action.targetRef);
        break;
      case "chain_rule":
        if (action.targetRef) output.chainedRuleId = action.targetRef;
        break;
      case "score":
        output.score = action.payload?.score ?? 0;
        break;
      case "log":
        messages.push(String(action.payload?.message ?? action.actionCode));
        break;
      case "stop":
        return { output, outcome, chainedPolicyIds, messages };
    }
  }

  if (!outcome && version.outcomes.length > 0) {
    outcome = version.outcomes[0];
  }

  return { output, outcome, chainedPolicyIds, messages };
}

function evaluateEpdePolicyInternal(
  policy: EpdePolicy,
  version: EpdePolicyVersion,
  context: EpdePolicyContext,
): EpdeEvaluationResult {
  validateEpdeEvaluationContext(version, context);
  const inherited = applyEpdeInheritance(policy, context);
  const matched = evaluateEpdeExpression(version, version.rootExpressionId, inherited);
  const { output, outcome, chainedPolicyIds, messages } = executeEpdeActions(version, matched);

  return {
    policyId: policy.id,
    policyCode: policy.policyCode,
    versionId: version.id,
    matched,
    outcome,
    output,
    score: typeof output.score === "number" ? output.score : undefined,
    chainedPolicyIds,
    messages,
  };
}

export function evaluateEpdePolicy(input: {
  policyCode: string;
  context: EpdePolicyContext;
  executedBy: string;
  persist?: boolean;
}): EpdeEvaluationResult {
  const policy = getEpdePorts().policies.findByCode(input.policyCode);
  if (!policy?.active || !policy.enabled) {
    throw new Error(`EPDE: policy "${input.policyCode}" not found, inactive, or disabled.`);
  }
  if (policy.lifecycleStatus !== EPDE_POLICY_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`EPDE: policy "${input.policyCode}" is not published.`);
  }
  if (!isEpdePolicyEffective(policy, input.context.asOfDate)) {
    throw new Error(`EPDE: policy "${input.policyCode}" is not effective for the given date.`);
  }
  if (!matchesEpdeScope(policy, input.context)) {
    return {
      policyId: policy.id,
      policyCode: policy.policyCode,
      versionId: "",
      matched: false,
      output: {},
      chainedPolicyIds: [],
      messages: ["Policy scope mismatch."],
    };
  }

  const version = getEpdePublishedVersion(policy.id);
  if (!version) throw new Error(`EPDE: no published version for policy "${input.policyCode}".`);

  const start = Date.now();
  const result = evaluateEpdePolicyInternal(policy, version, input.context);

  if (input.persist !== false) {
    const simulation: EpdeSimulationResult = {
      executionId: input.context.executionId,
      mode: "evaluate",
      results: [result],
      conflicts: [],
      resolutions: [],
      simulated: false,
      executedBy: input.executedBy,
      executedOn: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
    getEpdePorts().simulations.append(simulation);
    recordEpdePolicyAudit({
      entityId: simulation.executionId,
      entityType: "execution",
      action: "evaluated",
      actorId: input.executedBy,
      remarks: `Evaluated policy ${policy.policyCode} — matched: ${result.matched}`,
    });
  }

  return result;
}

export function evaluateEpdePolicyGroup(input: {
  groupCode: string;
  context: EpdePolicyContext;
  executedBy: string;
}): EpdeSimulationResult {
  const group = getEpdePorts().policyGroups.findByCode(input.groupCode);
  if (!group?.enabled) throw new Error(`EPDE: policy group "${input.groupCode}" not found.`);

  const start = Date.now();
  const results: EpdeEvaluationResult[] = [];
  const visited = new Set<string>();
  const policies = group.policyIds
    .map((id) => getEpdePorts().policies.findById(id))
    .filter((p): p is EpdePolicy => !!p && p.active && p.enabled)
    .sort((a, b) => a.priority - b.priority);

  const queue = [...policies];
  while (queue.length > 0) {
    const policy = queue.shift()!;
    if (visited.has(policy.id)) continue;
    visited.add(policy.id);

    const version = getEpdePublishedVersion(policy.id);
    if (!version || !matchesEpdeScope(policy, input.context) || !isEpdePolicyEffective(policy, input.context.asOfDate)) {
      continue;
    }

    const result = evaluateEpdePolicyInternal(policy, version, input.context);
    results.push(result);

    for (const chainedId of result.chainedPolicyIds) {
      const chained = getEpdePorts().policies.findById(chainedId);
      if (chained) queue.push(chained);
    }
  }

  const simulation: EpdeSimulationResult = {
    executionId: input.context.executionId,
    mode: "evaluate",
    results,
    conflicts: [],
    resolutions: [],
    simulated: false,
    executedBy: input.executedBy,
    executedOn: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  getEpdePorts().simulations.append(simulation);
  return simulation;
}
