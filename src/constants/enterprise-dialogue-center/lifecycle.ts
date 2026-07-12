export const EDC_FRAMEWORK_VERSION = "1.0.0-spr001";

export const EDC_CONTEXT_TYPES = {
  OPPORTUNITY: "opportunity",
  LOAN: "loan",
  CUSTOMER: "customer",
} as const;

export const EDC_EVENT_TYPES = {
  STAGE_CHANGE: "stage_change",
  SUB_STAGE_CHANGE: "sub_stage_change",
  PROGRESS: "progress",
  TASK: "task",
  EMAIL: "email",
  NOTIFICATION: "notification",
  INTERNAL_MESSAGE: "internal_message",
  DOCUMENT_UPLOAD: "document_upload",
  DOCUMENT_VERIFICATION: "document_verification",
  WORKFLOW: "workflow",
} as const;
