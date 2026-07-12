/**
 * EWOE defaults — ECG-ready. Aligns stages to EOLE codes.
 */

import { EOLE_DEFAULT_STAGES, EOLE_DEFAULT_SUB_STAGES } from "@/constants/enterprise-opportunity-lifecycle-engine";
import type {
  EwoeOrchestrationConfig,
  EwoeWorkflowDefinition,
  EwoeWorkflowScope,
  EwoeWorkflowStageDef,
} from "@/types/enterprise-workflow-orchestration-engine";

export const EWOE_FRAMEWORK_VERSION = "12.0.0";

export const EWOE_EVENT_TYPES = {
  STAGE_CHANGED: "stage_changed",
  SUB_STAGE_CHANGED: "sub_stage_changed",
  DOCUMENT_UPLOADED: "document_uploaded",
  TASK_COMPLETED: "task_completed",
  LENDER_SELECTED: "lender_selected",
  APPROVAL_RECEIVED: "approval_received",
  DISBURSEMENT: "disbursement",
  ACTIVITY_COMPLETED: "activity_completed",
  TRIGGER_EXECUTED: "trigger_executed",
  WORKFLOW_STARTED: "workflow_started",
  WORKFLOW_COMPLETED: "workflow_completed",
} as const;

export const EWOE_ENGINE_TARGETS = {
  EDIE: "edie",
  ETE: "ete",
  ENCE: "ence",
  LIFE: "life",
  EOLE: "eole",
} as const;

export const DEFAULT_EWOE_ORCHESTRATION_CONFIG: EwoeOrchestrationConfig = {
  autoPublishDialogue: true,
  autoExecuteTriggers: true,
  contributeToIntelligence: true,
  intelligenceBlendWeight: 1,
};

export const DEFAULT_EWOE_HOME_LOAN_SCOPE: EwoeWorkflowScope = {
  productRef: "product:home-loan",
  customerType: "individual",
  employmentType: "salaried",
  constitution: "individual",
  opportunityType: "secured_lending",
};

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Build default HL salaried workflow from EOLE stage/sub-stage catalogues. */
export function buildDefaultHomeLoanWorkflowDefinition(
  actorId = "system",
): Omit<EwoeWorkflowDefinition, "id" | "createdOn" | "modifiedOn"> {
  const stages: EwoeWorkflowStageDef[] = EOLE_DEFAULT_STAGES.map((stage, index) => {
    const next = EOLE_DEFAULT_STAGES[index + 1];
    const matchingSubs = EOLE_DEFAULT_SUB_STAGES.filter((s) => s.stageCode === stage.stageCode);

    const subStages = matchingSubs.map((sub, subIndex) => ({
      id: id("ewoe-sub"),
      subStageCode: sub.subStageCode,
      subStageName: sub.subStageName,
      sortOrder: sub.sortOrder,
      activities: [],
      completionConditions: [
        {
          id: id("ewoe-cc"),
          type: "manual" as const,
          description: `Complete ${sub.subStageName}`,
          required: true,
        },
      ],
      nextSubStageCode: matchingSubs[subIndex + 1]?.subStageCode,
      triggers: [],
    }));

    const triggers =
      stage.stageCode === "document_collection"
        ? [
            {
              id: id("ewoe-tr"),
              target: "edie" as const,
              action: "resolve_document_rules",
              description: "Activate EDIE document pack for collection stage",
              enabled: true,
              payload: { loanStage: "document_collection" },
            },
          ]
        : stage.stageCode === "processing"
          ? [
              {
                id: id("ewoe-tr"),
                target: "ete" as const,
                action: "ensure_follow_up_task",
                description: "Ensure follow-up task exists via ETE",
                enabled: true,
                payload: { predefinedDescription: "Follow-up Documents" },
              },
              {
                id: id("ewoe-tr"),
                target: "ence" as const,
                action: "simulate_stage_communication",
                description: "Simulate ENCE communication for processing",
                enabled: true,
              },
            ]
          : stage.stageCode === "lender_review"
            ? [
                {
                  id: id("ewoe-tr"),
                  target: "life" as const,
                  action: "select_lender_executors",
                  description: "Prompt LIFE lender executor selection",
                  enabled: true,
                  payload: { city: "Pune", productRef: "product:home-loan" },
                },
              ]
            : [];

    const activities =
      stage.stageCode === "document_collection"
        ? [
            {
              id: id("ewoe-act"),
              activityCode: "collect_kyc",
              title: "Collect KYC documents",
              activityType: "document" as const,
              required: true,
              sortOrder: 1,
              trigger: {
                id: id("ewoe-tr"),
                target: "edie" as const,
                action: "resolve_document_rules",
                description: "EDIE KYC pack",
                enabled: true,
              },
            },
          ]
        : stage.stageCode === "processing"
          ? [
              {
                id: id("ewoe-act"),
                activityCode: "follow_up_docs",
                title: "Follow-up documents task",
                activityType: "task" as const,
                required: true,
                sortOrder: 1,
                trigger: {
                  id: id("ewoe-tr"),
                  target: "ete" as const,
                  action: "ensure_follow_up_task",
                  description: "ETE follow-up",
                  enabled: true,
                },
              },
            ]
          : [];

    return {
      id: id("ewoe-stage"),
      stageCode: stage.stageCode,
      stageName: stage.stageName,
      sortOrder: stage.sortOrder,
      subStages,
      activities,
      completionConditions: [
        {
          id: id("ewoe-cc"),
          type:
            stage.stageCode === "document_collection"
              ? ("documents_verified" as const)
              : ("manual" as const),
          description: `Complete ${stage.stageName}`,
          required: true,
        },
      ],
      nextStageCode: next?.stageCode,
      triggers,
    };
  });

  return {
    definitionCode: "EWOE-HL-SAL-001",
    name: "Home Loan · Salaried · Individual",
    version: 1,
    scope: { ...DEFAULT_EWOE_HOME_LOAN_SCOPE },
    stages,
    enabled: true,
    createdBy: actorId,
    modifiedBy: actorId,
  };
}
