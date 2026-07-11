/**
 * EPDE conflict resolution engine.
 */

import { EPDE_CONFLICT_STRATEGIES } from "@/constants/enterprise-policy-decision-engine";
import type {
  EpdeConflictResolutionStrategy,
  EpdeEvaluationResult,
  EpdePolicyConflict,
  EpdePolicyGroup,
  EpdePolicyResolution,
} from "@/types/enterprise-policy-decision-engine";
import { getEpdePorts } from "./composition";

export function detectEpdePolicyConflicts(
  group: EpdePolicyGroup,
  results: EpdeEvaluationResult[],
): EpdePolicyConflict[] {
  const conflicts: EpdePolicyConflict[] = [];
  const matched = results.filter((r) => r.matched);

  if (matched.length < 2) return conflicts;

  const dispositions = new Set(matched.map((r) => r.outcome?.disposition).filter(Boolean));
  if (dispositions.size > 1) {
    const conflict: EpdePolicyConflict = {
      id: crypto.randomUUID(),
      policyGroupId: group.id,
      conflictingPolicyIds: matched.map((r) => r.policyId),
      conflictType: "outcome_mismatch",
      detectedOn: new Date().toISOString(),
      resolved: false,
    };
    getEpdePorts().conflicts.save(conflict);
    conflicts.push(conflict);
  }

  const priorities = matched.map((r) => getEpdePorts().policies.findById(r.policyId)?.priority ?? 0);
  if (new Set(priorities).size < priorities.length) {
    const conflict: EpdePolicyConflict = {
      id: crypto.randomUUID(),
      policyGroupId: group.id,
      conflictingPolicyIds: matched.map((r) => r.policyId),
      conflictType: "priority_collision",
      detectedOn: new Date().toISOString(),
      resolved: false,
    };
    getEpdePorts().conflicts.save(conflict);
    conflicts.push(conflict);
  }

  return conflicts;
}

export function resolveEpdePolicyConflict(input: {
  conflictId: string;
  strategy?: EpdeConflictResolutionStrategy;
  results: EpdeEvaluationResult[];
  resolvedBy: string;
}): EpdePolicyResolution | undefined {
  const conflict = getEpdePorts().conflicts.findById(input.conflictId);
  if (!conflict || conflict.resolved) return undefined;

  const group = getEpdePorts().policyGroups.findById(conflict.policyGroupId);
  const strategy = input.strategy ?? group?.conflictResolution ?? EPDE_CONFLICT_STRATEGIES.PRIORITY;

  const matched = input.results.filter(
    (r) => r.matched && conflict.conflictingPolicyIds.includes(r.policyId),
  );

  if (matched.length === 0) return undefined;

  let winner = matched[0];

  if (strategy === EPDE_CONFLICT_STRATEGIES.PRIORITY || strategy === EPDE_CONFLICT_STRATEGIES.FIRST_MATCH) {
    winner = [...matched].sort((a, b) => {
      const pa = getEpdePorts().policies.findById(a.policyId)?.priority ?? 0;
      const pb = getEpdePorts().policies.findById(b.policyId)?.priority ?? 0;
      return pa - pb;
    })[0];
  } else if (strategy === EPDE_CONFLICT_STRATEGIES.DENY_OVERRIDES) {
    winner = matched.find((r) => r.outcome?.disposition === "deny") ?? winner;
  } else if (strategy === EPDE_CONFLICT_STRATEGIES.ALLOW_OVERRIDES) {
    winner = matched.find((r) => r.outcome?.disposition === "allow") ?? winner;
  }

  const resolution: EpdePolicyResolution = {
    id: crypto.randomUUID(),
    conflictId: conflict.id,
    strategy,
    winningPolicyId: winner.policyId,
    resolvedOutcome: winner.outcome ?? {
      id: crypto.randomUUID(),
      outcomeCode: "default",
      label: "Default",
      disposition: "inform",
    },
    resolvedOn: new Date().toISOString(),
    resolvedBy: input.resolvedBy,
  };

  getEpdePorts().resolutions.save(resolution);
  getEpdePorts().conflicts.save({ ...conflict, resolved: true });

  return resolution;
}
