/**
 * EWE lifecycle constants.
 */

export const EWE_FRAMEWORK_VERSION = "5.0.0";

export const EWE_DEFINITION_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  VALIDATED: "validated",
  APPROVED: "approved",
  PUBLISHED: "published",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
} as const;

export const EWE_INSTANCE_LIFECYCLE_STATUS = {
  CREATED: "created",
  RUNNING: "running",
  WAITING: "waiting",
  SUSPENDED: "suspended",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export const EWE_STATE_KINDS = {
  START: "start",
  INTERMEDIATE: "intermediate",
  TERMINAL: "terminal",
  WAIT: "wait",
  PARALLEL_FORK: "parallel_fork",
  PARALLEL_JOIN: "parallel_join",
} as const;

export const EWE_TRANSITION_KINDS = {
  SEQUENTIAL: "sequential",
  PARALLEL: "parallel",
  CONDITIONAL: "conditional",
  APPROVAL: "approval",
  EVENT: "event",
  TIMER: "timer",
  AUTOMATIC: "automatic",
  MANUAL: "manual",
} as const;

export const EWE_ACTION_KINDS = {
  MANUAL: "manual",
  AUTOMATED: "automated",
  APPROVAL: "approval",
  NOTIFICATION: "notification",
  SCRIPT: "script",
} as const;

/** Definition lifecycle transitions — configuration-driven. */
export const EWE_DEFINITION_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["validated", "archived"],
  validated: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["deprecated", "archived"],
  deprecated: ["archived", "published"],
  archived: [],
};

/** Instance lifecycle transitions — configuration-driven. */
export const EWE_INSTANCE_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  created: ["running", "cancelled"],
  running: ["waiting", "suspended", "completed", "cancelled", "failed"],
  waiting: ["running", "suspended", "completed", "cancelled", "failed"],
  suspended: ["running", "waiting", "cancelled", "failed"],
  completed: [],
  cancelled: [],
  failed: [],
};

/** Maps lifecycle actions to target statuses. */
export const EWE_DEFINITION_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  validate: "validated",
  approve: "approved",
  publish: "published",
  deprecate: "deprecated",
  archive: "archived",
  revert_to_draft: "draft",
};

export const EWE_INSTANCE_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  start: "running",
  wait: "waiting",
  suspend: "suspended",
  resume: "running",
  complete: "completed",
  cancel: "cancelled",
  fail: "failed",
  terminate: "cancelled",
};
