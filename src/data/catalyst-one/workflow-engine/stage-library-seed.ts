import type { StageLibraryEntry, SubStageLibraryEntry } from "@/types/workflow-engine";

/** Platform stage library — reusable across all workflow definitions. */
export const DEFAULT_STAGE_LIBRARY: StageLibraryEntry[] = [
  { id: "stg_intake", stageCode: "INTAKE", stageName: "Intake", description: "Initial capture and validation of work item.", category: "Initiation", sortOrder: 1, enabled: true },
  { id: "stg_triage", stageCode: "TRIAGE", stageName: "Triage", description: "Classification and routing decision.", category: "Initiation", sortOrder: 2, enabled: true },
  { id: "stg_review", stageCode: "REVIEW", stageName: "Review", description: "Structured review and assessment.", category: "Processing", sortOrder: 3, enabled: true },
  { id: "stg_approval", stageCode: "APPROVAL", stageName: "Approval", description: "Authorization gate before progression.", category: "Governance", sortOrder: 4, enabled: true },
  { id: "stg_execution", stageCode: "EXECUTION", stageName: "Execution", description: "Primary work execution phase.", category: "Processing", sortOrder: 5, enabled: true },
  { id: "stg_verification", stageCode: "VERIFICATION", stageName: "Verification", description: "Quality and compliance verification.", category: "Quality", sortOrder: 6, enabled: true },
  { id: "stg_completion", stageCode: "COMPLETION", stageName: "Completion", description: "Finalization and handoff.", category: "Closure", sortOrder: 7, enabled: true },
  { id: "stg_archive", stageCode: "ARCHIVE", stageName: "Archive", description: "Retired workflow instance state.", category: "Closure", sortOrder: 8, enabled: true },
];

export const DEFAULT_SUB_STAGE_LIBRARY: SubStageLibraryEntry[] = [
  { id: "sst_intake_new", subStageCode: "NEW", subStageName: "New", parentStageId: "stg_intake", description: "Newly created work item.", sortOrder: 1, enabled: true },
  { id: "sst_intake_validated", subStageCode: "VALIDATED", subStageName: "Validated", parentStageId: "stg_intake", description: "Intake validation passed.", sortOrder: 2, enabled: true },
  { id: "sst_review_progress", subStageCode: "IN_PROGRESS", subStageName: "In Progress", parentStageId: "stg_review", description: "Review actively in progress.", sortOrder: 1, enabled: true },
  { id: "sst_review_query", subStageCode: "QUERY", subStageName: "Query Raised", parentStageId: "stg_review", description: "Pending query resolution.", sortOrder: 2, enabled: true },
  { id: "sst_approval_pending", subStageCode: "PENDING", subStageName: "Pending Approval", parentStageId: "stg_approval", description: "Awaiting approver action.", sortOrder: 1, enabled: true },
  { id: "sst_approval_conditional", subStageCode: "CONDITIONAL", subStageName: "Conditional", parentStageId: "stg_approval", description: "Approved with conditions.", sortOrder: 2, enabled: true },
  { id: "sst_exec_active", subStageCode: "ACTIVE", subStageName: "Active", parentStageId: "stg_execution", description: "Execution in progress.", sortOrder: 1, enabled: true },
  { id: "sst_exec_blocked", subStageCode: "BLOCKED", subStageName: "Blocked", parentStageId: "stg_execution", description: "Execution blocked pending dependency.", sortOrder: 2, enabled: true },
];
