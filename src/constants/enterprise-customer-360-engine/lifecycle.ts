/**
 * EC360 lifecycle and framework constants.
 */

export const EC360_FRAMEWORK_VERSION = "10.0.0";

export const EC360_CUSTOMER_LIFECYCLE_STATUS = {
  PROSPECT: "prospect",
  LEAD: "lead",
  ACTIVE: "active",
  DORMANT: "dormant",
  ARCHIVED: "archived",
} as const;

export const EC360_CUSTOMER_TYPES = {
  INDIVIDUAL: "individual",
  ORGANIZATION: "organization",
} as const;

export const EC360_CUSTOMER_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  prospect: ["lead", "archived"],
  lead: ["active", "prospect", "archived"],
  active: ["dormant", "archived"],
  dormant: ["active", "archived"],
  archived: [],
};

export const EC360_CUSTOMER_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  qualify: "lead",
  activate: "active",
  dormant: "dormant",
  reactivate: "active",
  archive: "archived",
};

export const EC360_COMMUNICATION_CHANNELS = {
  EMAIL: "email",
  SMS: "sms",
  PHONE: "phone",
  PUSH: "push",
  POSTAL: "postal",
} as const;

export const EC360_CONSENT_STATUS = {
  GRANTED: "granted",
  DENIED: "denied",
  REVOKED: "revoked",
  PENDING: "pending",
} as const;
