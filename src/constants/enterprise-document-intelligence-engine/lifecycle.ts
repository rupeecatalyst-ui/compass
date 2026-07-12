/**
 * EDIE lifecycle and framework constants.
 */

/** SPR-001 extension: document rules port/registry (patch bump from 11.0.0). */
export const EDIE_FRAMEWORK_VERSION = "11.0.1";

export const EDIE_DOCUMENT_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  UPLOADED: "uploaded",
  VERIFIED: "verified",
  APPROVED: "approved",
  ACTIVE: "active",
  EXPIRED: "expired",
  ARCHIVED: "archived",
  DESTROYED: "destroyed",
} as const;

export const EDIE_DOCUMENT_CATEGORIES = {
  IDENTITY: "identity",
  FINANCIAL: "financial",
  LEGAL: "legal",
  OPERATIONAL: "operational",
  COMPLIANCE: "compliance",
  COMMUNICATION: "communication",
  GENERAL: "general",
} as const;

export const EDIE_DOCUMENT_CLASSIFICATIONS = {
  PUBLIC: "public",
  INTERNAL: "internal",
  CONFIDENTIAL: "confidential",
  RESTRICTED: "restricted",
} as const;

export const EDIE_SUBJECT_ENTITY_TYPES = {
  CUSTOMER: "customer",
  PARTNER: "partner",
  ORGANIZATION: "organization",
  EMPLOYEE: "employee",
  OPPORTUNITY: "opportunity",
  LOAN: "loan",
  PROPERTY: "property",
  WORKFLOW: "workflow",
  TASK: "task",
  CASE: "case",
  PRODUCT: "product",
  DOCUMENT: "document",
} as const;

export const EDIE_DOCUMENT_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["uploaded", "archived", "destroyed"],
  uploaded: ["verified", "draft", "archived"],
  verified: ["approved", "uploaded", "archived"],
  approved: ["active", "verified", "archived"],
  active: ["expired", "archived"],
  expired: ["active", "archived", "destroyed"],
  archived: ["active", "destroyed"],
  destroyed: [],
};

export const EDIE_DOCUMENT_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  upload: "uploaded",
  verify: "verified",
  approve: "approved",
  activate: "active",
  expire: "expired",
  archive: "archived",
  destroy: "destroyed",
};
