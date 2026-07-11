/**
 * EOLE validation engine — domain validation and derived logic.
 */

import {
  EOLE_OPPORTUNITY_LIFECYCLE_TRANSITIONS,
  EOLE_TERMINAL_LIFECYCLE_STATUSES,
} from "@/constants/enterprise-opportunity-lifecycle-engine";
import type {
  EoleOpportunity,
  EoleOpportunityAging,
  EoleOpportunityAgingPolicy,
  EoleOpportunityAssignment,
  EoleOpportunityExecutor,
  EoleOpportunityHold,
  EoleOpportunityLifecycleStatus,
  EoleOpportunityOwner,
  EoleOpportunityStage,
  EoleValidationResult,
} from "@/types/enterprise-opportunity-lifecycle-engine";
import { getEolePorts } from "./composition";

function issue(code: string, message: string, severity: "error" | "warning" = "error", entityRef?: string) {
  return { code, severity, message, entityRef };
}

export function validateEoleOpportunity(
  opportunity: EoleOpportunity,
  existing: EoleOpportunity[],
): EoleValidationResult {
  const issues = [];

  if (!opportunity.customerRef) {
    issues.push(issue("EOLE_MISSING_CUSTOMER", "Customer reference is required."));
  }

  if (!opportunity.productRef) {
    issues.push(issue("EOLE_MISSING_PRODUCT", "Product reference is required."));
  }

  if (!opportunity.financialRequirementId) {
    issues.push(issue("EOLE_MISSING_FINANCIAL_REQUIREMENT", "Financial requirement is required."));
  }

  const duplicate = existing.find(
    (o) =>
      o.id !== opportunity.id &&
      o.customerRef === opportunity.customerRef &&
      o.productRef === opportunity.productRef &&
      o.financialRequirementId === opportunity.financialRequirementId &&
      !EOLE_TERMINAL_LIFECYCLE_STATUSES.includes(o.lifecycleStatus as (typeof EOLE_TERMINAL_LIFECYCLE_STATUSES)[number]),
  );
  if (duplicate) {
    issues.push(
      issue(
        "EOLE_DUPLICATE_OPPORTUNITY",
        `Active opportunity already exists for customer ${opportunity.customerRef}, product ${opportunity.productRef}, and financial requirement ${opportunity.financialRequirementId}.`,
        "error",
        duplicate.id,
      ),
    );
  }

  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues };
}

export function validateEoleOwner(
  owner: EoleOpportunityOwner,
  existingOwners: EoleOpportunityOwner[],
): EoleValidationResult {
  const issues = [];

  if (!owner.ownerRef) {
    issues.push(issue("EOLE_INVALID_OWNER", "Owner reference is required."));
  }

  if (owner.isSourceOwner) {
    const existingSource = existingOwners.find(
      (o) => o.id !== owner.id && o.opportunityId === owner.opportunityId && o.isSourceOwner,
    );
    if (existingSource) {
      issues.push(
        issue(
          "EOLE_INVALID_OWNER",
          "Source owner already assigned. Source owner is immutable once set.",
          "error",
          existingSource.id,
        ),
      );
    }
  }

  return { valid: issues.length === 0, issues };
}

export function validateEoleExecutor(
  executor: EoleOpportunityExecutor,
  existingExecutors: EoleOpportunityExecutor[],
): EoleValidationResult {
  const issues = [];

  const duplicate = existingExecutors.find(
    (e) =>
      e.id !== executor.id &&
      e.opportunityId === executor.opportunityId &&
      e.executorRef === executor.executorRef &&
      e.active &&
      executor.active,
  );
  if (duplicate) {
    issues.push(
      issue("EOLE_DUPLICATE_EXECUTOR", `Executor ${executor.executorRef} is already active.`, "error", duplicate.id),
    );
  }

  return { valid: issues.length === 0, issues };
}

export function validateEoleAssignment(
  assignment: EoleOpportunityAssignment,
  existingAssignments: EoleOpportunityAssignment[],
): EoleValidationResult {
  const issues = [];
  const visited = new Set<string>();
  let current: string | undefined = assignment.parentAssignmentId;

  while (current) {
    if (visited.has(current)) {
      issues.push(issue("EOLE_CIRCULAR_ASSIGNMENT", "Circular assignment chain detected.", "error", current));
      break;
    }
    visited.add(current);
    const parent = existingAssignments.find((a) => a.id === current);
    current = parent?.parentAssignmentId;
  }

  return { valid: issues.length === 0, issues };
}

export function validateEoleLifecycleTransition(
  fromStatus: EoleOpportunityLifecycleStatus,
  toStatus: EoleOpportunityLifecycleStatus,
): EoleValidationResult {
  const allowed = EOLE_OPPORTUNITY_LIFECYCLE_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      issues: [
        issue(
          "EOLE_INVALID_LIFECYCLE",
          `Transition from "${fromStatus}" to "${toStatus}" is not permitted.`,
        ),
      ],
    };
  }
  return { valid: true, issues: [] };
}

export function validateEoleStage(stageCode: string, stages: EoleOpportunityStage[]): EoleValidationResult {
  const stage = stages.find((s) => s.stageCode === stageCode);
  if (!stage || !stage.enabled) {
    return {
      valid: false,
      issues: [issue("EOLE_INVALID_STAGE", `Stage "${stageCode}" is not valid or enabled.`)],
    };
  }
  return { valid: true, issues: [] };
}

export function validateEoleHold(hold: EoleOpportunityHold): EoleValidationResult {
  const issues = [];

  if (!hold.holdReason) {
    issues.push(issue("EOLE_INVALID_HOLD", "Hold reason is required."));
  }

  if (hold.holdDurationDays > hold.maxHoldPeriodDays) {
    issues.push(
      issue(
        "EOLE_INVALID_HOLD",
        `Hold duration (${hold.holdDurationDays} days) exceeds maximum hold period (${hold.maxHoldPeriodDays} days).`,
        "error",
      ),
    );
  }

  if (hold.holdDurationDays >= hold.maxHoldPeriodDays) {
    issues.push(
      issue(
        "EOLE_HOLD_EXPIRED",
        "Hold period has expired. Closure is recommended.",
        "warning",
        hold.id,
      ),
    );
  }

  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues };
}

export function validateEolePipelineAging(
  aging: EoleOpportunityAging,
  policy: EoleOpportunityAgingPolicy,
): EoleValidationResult {
  const issues = [];

  if (aging.daysInStage > policy.maxDays) {
    issues.push(
      issue(
        "EOLE_AGING_EXCEEDED",
        `Stage "${aging.stageCode}" has exceeded maximum days (${policy.maxDays}). Current: ${aging.daysInStage}.`,
        "warning",
        aging.opportunityId,
      ),
    );
  }

  return { valid: true, issues };
}

export function isEoleTerminalStatus(status: EoleOpportunityLifecycleStatus): boolean {
  return (EOLE_TERMINAL_LIFECYCLE_STATUSES as readonly string[]).includes(status);
}

export function syncEoleDisbursementStatus(input: {
  opportunityId: string;
  disbursementStatus: "not_disbursed" | "partially_disbursed" | "fully_disbursed";
}): EoleOpportunityLifecycleStatus {
  switch (input.disbursementStatus) {
    case "partially_disbursed":
      return "partially_disbursed";
    case "fully_disbursed":
      return "fully_disbursed";
    default:
      return getEolePorts().opportunities.findById(input.opportunityId)?.lifecycleStatus ?? "approved";
  }
}

export function computeEoleAgingSeverity(
  daysInStage: number,
  policy: EoleOpportunityAgingPolicy,
): EoleOpportunityAging["severity"] {
  if (daysInStage >= policy.missionControlNotificationDays) return "mission_control";
  if (daysInStage >= policy.managerNotificationDays) return "manager_notification";
  if (daysInStage >= policy.escalationDays) return "escalation";
  if (daysInStage >= policy.reminderDays) return "reminder";
  return "none";
}
