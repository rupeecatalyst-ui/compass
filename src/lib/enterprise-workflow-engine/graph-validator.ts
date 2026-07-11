/**
 * EWE workflow graph validator — directed graph and state machine checks.
 */

import { EWE_STATE_KINDS } from "@/constants/enterprise-workflow-engine";
import type {
  EweValidationIssue,
  EweValidationResult,
  EweWorkflowVersion,
} from "@/types/enterprise-workflow-engine";

function issue(
  code: string,
  severity: EweValidationIssue["severity"],
  message: string,
  entityRef?: string,
): EweValidationIssue {
  return { code, severity, message, entityRef };
}

export function validateEweWorkflowGraph(version: EweWorkflowVersion): EweValidationResult {
  const issues: EweValidationIssue[] = [];
  const stateIds = new Set(version.states.map((s) => s.id));
  const enabledStates = version.states.filter((s) => s.enabled);
  const enabledTransitions = version.transitions.filter((t) => t.enabled);

  // Start state
  const startStates = enabledStates.filter((s) => s.stateKind === EWE_STATE_KINDS.START);
  if (startStates.length === 0) {
    issues.push(issue("EWE_INVALID_START_STATE", "error", "Workflow must have exactly one start state."));
  } else if (startStates.length > 1) {
    issues.push(
      issue("EWE_INVALID_START_STATE", "error", "Workflow must have exactly one start state.", startStates[1].id),
    );
  }

  if (!stateIds.has(version.startStateId)) {
    issues.push(
      issue("EWE_INVALID_START_STATE", "error", "startStateId must reference an existing state.", version.startStateId),
    );
  } else {
    const start = version.states.find((s) => s.id === version.startStateId);
    if (start && start.stateKind !== EWE_STATE_KINDS.START) {
      issues.push(
        issue("EWE_INVALID_START_STATE", "error", "startStateId must reference a start-kind state.", version.startStateId),
      );
    }
  }

  // Terminal states
  const terminalStates = enabledStates.filter((s) => s.stateKind === EWE_STATE_KINDS.TERMINAL);
  if (terminalStates.length === 0) {
    issues.push(issue("EWE_INVALID_TERMINAL_STATE", "error", "Workflow must have at least one terminal state."));
  }

  for (const terminalId of version.terminalStateIds) {
    if (!stateIds.has(terminalId)) {
      issues.push(
        issue("EWE_INVALID_TERMINAL_STATE", "error", "terminalStateIds must reference existing states.", terminalId),
      );
      continue;
    }
    const terminal = version.states.find((s) => s.id === terminalId);
    if (terminal && terminal.stateKind !== EWE_STATE_KINDS.TERMINAL) {
      issues.push(
        issue("EWE_INVALID_TERMINAL_STATE", "error", "terminalStateIds must reference terminal-kind states.", terminalId),
      );
    }
  }

  // Invalid transitions
  for (const transition of enabledTransitions) {
    if (!stateIds.has(transition.fromStateId)) {
      issues.push(
        issue("EWE_INVALID_TRANSITION", "error", `Transition "${transition.transitionCode}" has invalid fromStateId.`, transition.id),
      );
    }
    if (!stateIds.has(transition.toStateId)) {
      issues.push(
        issue("EWE_INVALID_TRANSITION", "error", `Transition "${transition.transitionCode}" has invalid toStateId.`, transition.id),
      );
    }
  }

  // Circular transitions (cycle detection)
  const cycles = detectEweTransitionCycles(enabledTransitions);
  for (const cycle of cycles) {
    issues.push(
      issue("EWE_CIRCULAR_TRANSITION", "error", `Circular transition detected: ${cycle.join(" → ")}.`),
    );
  }

  // Unreachable states
  const reachable = getEweReachableStates(version.startStateId, enabledTransitions);
  for (const state of enabledStates) {
    if (!reachable.has(state.id) && state.stateKind !== EWE_STATE_KINDS.START) {
      issues.push(
        issue("EWE_UNREACHABLE_STATE", "warning", `State "${state.stateCode}" is unreachable from start.`, state.id),
      );
    }
  }

  // SLA consistency
  const slaIds = new Set(version.slas.map((s) => s.id));
  const escalationIds = new Set(version.escalations.map((e) => e.id));
  for (const sla of version.slas) {
    if (sla.warningThresholdPercent < 0 || sla.warningThresholdPercent > 100) {
      issues.push(
        issue("EWE_SLA_INCONSISTENT", "error", `SLA "${sla.slaCode}" warning threshold must be 0–100.`, sla.id),
      );
    }
    if (sla.targetDurationMs <= 0) {
      issues.push(
        issue("EWE_SLA_INCONSISTENT", "error", `SLA "${sla.slaCode}" target duration must be positive.`, sla.id),
      );
    }
    if (sla.escalationId && !escalationIds.has(sla.escalationId)) {
      issues.push(
        issue("EWE_SLA_INCONSISTENT", "error", `SLA "${sla.slaCode}" references unknown escalation.`, sla.id),
      );
    }
    if (sla.breachAction === "escalate" && !sla.escalationId) {
      issues.push(
        issue("EWE_SLA_INCONSISTENT", "error", `SLA "${sla.slaCode}" with escalate breach action requires escalationId.`, sla.id),
      );
    }
  }

  for (const escalation of version.escalations) {
    if (escalation.triggerAfterMs <= 0) {
      issues.push(
        issue("EWE_SLA_INCONSISTENT", "error", `Escalation "${escalation.escalationCode}" trigger must be positive.`, escalation.id),
      );
    }
  }

  // Assignment consistency
  const assignmentIds = new Set(version.assignments.map((a) => a.id));
  const participantIds = new Set(version.participants.map((p) => p.id));
  const queueIds = new Set(version.queues.map((q) => q.id));

  for (const assignment of version.assignments) {
    for (const participantId of assignment.participantIds) {
      if (!participantIds.has(participantId)) {
        issues.push(
          issue("EWE_ASSIGNMENT_INCONSISTENT", "error", `Assignment "${assignment.assignmentCode}" references unknown participant.`, assignment.id),
        );
      }
    }
    if (assignment.queueId && !queueIds.has(assignment.queueId)) {
      issues.push(
        issue("EWE_ASSIGNMENT_INCONSISTENT", "error", `Assignment "${assignment.assignmentCode}" references unknown queue.`, assignment.id),
      );
    }
  }

  for (const state of enabledStates) {
    if (state.assignmentId && !assignmentIds.has(state.assignmentId)) {
      issues.push(
        issue("EWE_ASSIGNMENT_INCONSISTENT", "error", `State "${state.stateCode}" references unknown assignment.`, state.id),
      );
    }
    if (state.slaId && !slaIds.has(state.slaId)) {
      issues.push(
        issue("EWE_SLA_INCONSISTENT", "error", `State "${state.stateCode}" references unknown SLA.`, state.id),
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

function getEweReachableStates(
  startStateId: string,
  transitions: EweWorkflowVersion["transitions"],
): Set<string> {
  const reachable = new Set<string>();
  const queue = [startStateId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    for (const t of transitions) {
      if (t.fromStateId === current && !reachable.has(t.toStateId)) {
        queue.push(t.toStateId);
      }
    }
  }

  return reachable;
}

function detectEweTransitionCycles(
  transitions: EweWorkflowVersion["transitions"],
): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const t of transitions) {
    const edges = adjacency.get(t.fromStateId) ?? [];
    edges.push(t.toStateId);
    adjacency.set(t.fromStateId, edges);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    stack.add(node);
    path.push(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (stack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }

    path.pop();
    stack.delete(node);
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) dfs(node);
  }

  return cycles;
}
