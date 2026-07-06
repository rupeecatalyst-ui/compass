import type {
  AssignmentStrategy,
  EscalationDefinition,
  WorkflowEventDefinition,
  WorkflowSlaDefinition,
} from "@/types/workflow-engine";

export const DEFAULT_ASSIGNMENT_STRATEGIES: AssignmentStrategy[] = [
  { id: "asgn_rr", strategyType: "round_robin", label: "Round Robin", description: "Distribute work evenly across eligible assignees.", enabled: true },
  { id: "asgn_lb", strategyType: "load_balanced", label: "Load Balanced", description: "Assign to assignee with lowest active workload.", configRef: "workload.capacity", enabled: true },
  { id: "asgn_role", strategyType: "role_based", label: "Role Based", description: "Assign based on configured role mapping.", configRef: "assignment.role_map", enabled: true },
  { id: "asgn_owner", strategyType: "owner_based", label: "Owner Based", description: "Assign to artifact or record owner.", enabled: true },
  { id: "asgn_manual", strategyType: "manual", label: "Manual", description: "Require explicit manual assignment.", enabled: true },
  { id: "asgn_meta", strategyType: "metadata_driven", label: "Metadata Driven", description: "Resolve assignee from metadata configuration.", configRef: "assignment.metadata", enabled: true },
];

export const DEFAULT_WORKFLOW_SLA_DEFINITIONS: WorkflowSlaDefinition[] = [
  { id: "sla_std_24", slaCode: "SLA_24H", label: "Standard 24 Hour", description: "Standard SLA for routine workflow stages.", targetDurationHours: 24, warningThresholdPercent: 80, breachAction: "flag" },
  { id: "sla_urgent_4", slaCode: "SLA_4H", label: "Urgent 4 Hour", description: "Urgent SLA for time-critical stages.", targetDurationHours: 4, warningThresholdPercent: 75, breachAction: "escalate" },
  { id: "sla_review_48", slaCode: "SLA_48H_REVIEW", label: "Review 48 Hour", description: "Extended SLA for review-heavy stages.", targetDurationHours: 48, warningThresholdPercent: 85, breachAction: "notify" },
];

export const DEFAULT_ESCALATION_DEFINITIONS: EscalationDefinition[] = [
  { id: "esc_l1", escalationCode: "ESC_L1", label: "Level 1 Escalation", description: "Escalate to team lead after SLA breach.", triggerAfterHours: 24, escalateToRoleRef: "team_lead" },
  { id: "esc_l2", escalationCode: "ESC_L2", label: "Level 2 Escalation", description: "Escalate to manager after extended breach.", triggerAfterHours: 48, escalateToRoleRef: "manager" },
  { id: "esc_critical", escalationCode: "ESC_CRITICAL", label: "Critical Escalation", description: "Immediate escalation for critical workflows.", triggerAfterHours: 2, escalateToRoleRef: "operations_head" },
];

export const DEFAULT_WORKFLOW_EVENT_DEFINITIONS: WorkflowEventDefinition[] = [
  { id: "evt_stage_enter", eventCode: "STAGE_ENTERED", eventName: "Stage Entered", description: "Emitted when a workflow instance enters a stage.", payloadSchemaRef: "schema/workflow/stage_entered", enabled: true },
  { id: "evt_stage_exit", eventCode: "STAGE_EXITED", eventName: "Stage Exited", description: "Emitted when a workflow instance exits a stage.", payloadSchemaRef: "schema/workflow/stage_exited", enabled: true },
  { id: "evt_transition", eventCode: "TRANSITION_COMPLETED", eventName: "Transition Completed", description: "Emitted when a transition rule is satisfied.", payloadSchemaRef: "schema/workflow/transition_completed", enabled: true },
  { id: "evt_sla_warn", eventCode: "SLA_WARNING", eventName: "SLA Warning", description: "Emitted when SLA warning threshold is reached.", payloadSchemaRef: "schema/workflow/sla_warning", enabled: true },
  { id: "evt_sla_breach", eventCode: "SLA_BREACHED", eventName: "SLA Breached", description: "Emitted when SLA is breached.", payloadSchemaRef: "schema/workflow/sla_breached", enabled: true },
  { id: "evt_assigned", eventCode: "ASSIGNMENT_CHANGED", eventName: "Assignment Changed", description: "Emitted when work item assignment changes.", payloadSchemaRef: "schema/workflow/assignment_changed", enabled: true },
  { id: "evt_approved", eventCode: "APPROVAL_GRANTED", eventName: "Approval Granted", description: "Emitted when approval gate is passed.", payloadSchemaRef: "schema/workflow/approval_granted", enabled: true },
  { id: "evt_rejected", eventCode: "APPROVAL_REJECTED", eventName: "Approval Rejected", description: "Emitted when approval gate is rejected.", payloadSchemaRef: "schema/workflow/approval_rejected", enabled: true },
];
