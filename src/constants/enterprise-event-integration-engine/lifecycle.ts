/**
 * EEIE lifecycle and framework constants.
 */

export const EEIE_FRAMEWORK_VERSION = "6.0.0";

export const EEIE_EVENT_DEFINITION_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  VALIDATED: "validated",
  APPROVED: "approved",
  PUBLISHED: "published",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
} as const;

export const EEIE_EVENT_CATEGORIES = {
  DOMAIN: "domain",
  INTEGRATION: "integration",
  SYSTEM: "system",
  AUDIT: "audit",
  LIFECYCLE: "lifecycle",
  NOTIFICATION: "notification",
} as const;

export const EEIE_RETRY_STRATEGIES = {
  FIXED: "fixed",
  EXPONENTIAL: "exponential",
  LINEAR: "linear",
} as const;

export const EEIE_DEFINITION_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["validated", "archived"],
  validated: ["approved", "draft", "archived"],
  approved: ["published", "draft", "archived"],
  published: ["deprecated", "archived"],
  deprecated: ["archived", "published"],
  archived: [],
};

export const EEIE_DEFINITION_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  validate: "validated",
  approve: "approved",
  publish: "published",
  deprecate: "deprecated",
  archive: "archived",
  revert_to_draft: "draft",
};

export const EEIE_DEFAULT_EVENT_BUS = {
  busCode: "EEIE_DEFAULT_BUS",
  busName: "Catalyst One Event Bus",
  description: "In-memory default event bus",
  routingMode: "topic" as const,
};

export const EEIE_SCHEMA_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
