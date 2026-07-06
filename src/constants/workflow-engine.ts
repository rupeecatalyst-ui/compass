import type {
  AssignmentStrategyType,
  SlaBreachAction,
  WorkflowConditionOperator,
  WorkflowLifecycleStatus,
} from "@/types/workflow-engine";

export const WORKFLOW_LIFECYCLE_ORDER: WorkflowLifecycleStatus[] = [
  "draft",
  "validated",
  "testing",
  "approved",
  "published",
];

export const WORKFLOW_LIFECYCLE_LABELS: Record<WorkflowLifecycleStatus, string> = {
  draft: "Draft",
  validated: "Validated",
  testing: "Testing",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

type PillVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export const WORKFLOW_STATUS_PILL_VARIANT: Record<WorkflowLifecycleStatus, PillVariant> = {
  draft: "muted",
  validated: "info",
  testing: "warning",
  approved: "default",
  published: "success",
  archived: "muted",
};

export function formatWorkflowVersion(major: number, minor: number): string {
  return `v${major}.${minor}`;
}

export function isWorkflowActive(status: WorkflowLifecycleStatus): boolean {
  return status === "published";
}

export function canTransitionWorkflowStatus(
  from: WorkflowLifecycleStatus,
  to: WorkflowLifecycleStatus,
): boolean {
  if (from === to) return true;
  if (from === "archived" || to === "archived") return to === "archived";
  const order = WORKFLOW_LIFECYCLE_ORDER;
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx === fromIdx + 1;
}

export const WORKFLOW_CONDITION_OPERATOR_LABELS: Record<WorkflowConditionOperator, string> = {
  equals: "Equals",
  not_equals: "Not Equals",
  in: "In",
  not_in: "Not In",
  exists: "Exists",
  not_exists: "Not Exists",
  greater_than: "Greater Than",
  less_than: "Less Than",
};

export const ASSIGNMENT_STRATEGY_LABELS: Record<AssignmentStrategyType, string> = {
  round_robin: "Round Robin",
  load_balanced: "Load Balanced",
  role_based: "Role Based",
  owner_based: "Owner Based",
  manual: "Manual",
  metadata_driven: "Metadata Driven",
};

export const SLA_BREACH_ACTION_LABELS: Record<SlaBreachAction, string> = {
  escalate: "Escalate",
  notify: "Notify",
  flag: "Flag",
};

export const WORKFLOW_ENGINE_EXTENSIONS = [
  { id: "execution_runtime", label: "Execution Runtime", status: "reserved" as const },
  { id: "instance_store", label: "Instance Store", status: "reserved" as const },
  { id: "notification_bridge", label: "Notification Bridge", status: "reserved" as const },
  { id: "analytics", label: "Execution Analytics", status: "reserved" as const },
  { id: "bpm_designer", label: "BPM Designer", status: "reserved" as const },
  { id: "ai_orchestration", label: "AI Orchestration", status: "reserved" as const },
] as const;
