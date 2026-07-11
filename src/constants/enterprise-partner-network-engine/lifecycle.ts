/**
 * EPNE lifecycle and framework constants.
 */

export const EPNE_FRAMEWORK_VERSION = "9.0.0";

export const EPNE_PARTNER_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  PENDING_VERIFICATION: "pending_verification",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
} as const;

export const EPNE_AGREEMENT_LIFECYCLE_STATUS = {
  DRAFT: "draft",
  APPROVED: "approved",
  EFFECTIVE: "effective",
  EXPIRED: "expired",
  ARCHIVED: "archived",
} as const;

export const EPNE_PARTNER_CATEGORIES = {
  REFERRAL: "referral",
  DISTRIBUTION: "distribution",
  TECHNOLOGY: "technology",
  SERVICE: "service",
  CHANNEL: "channel",
  STRATEGIC: "strategic",
  GENERAL: "general",
} as const;

export const EPNE_PARTNER_TYPES = {
  INDIVIDUAL: "individual",
  ORGANIZATION: "organization",
  AGGREGATOR: "aggregator",
  FRANCHISE: "franchise",
  AFFILIATE: "affiliate",
} as const;

export const EPNE_PARTNER_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_verification", "archived"],
  pending_verification: ["active", "draft", "archived"],
  active: ["suspended", "inactive", "archived"],
  suspended: ["active", "inactive", "archived"],
  inactive: ["active", "archived"],
  archived: [],
};

export const EPNE_AGREEMENT_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ["approved", "archived"],
  approved: ["effective", "archived"],
  effective: ["expired", "archived"],
  expired: ["archived"],
  archived: [],
};

export const EPNE_PARTNER_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  submit: "pending_verification",
  verify: "active",
  activate: "active",
  suspend: "suspended",
  deactivate: "inactive",
  archive: "archived",
};

export const EPNE_AGREEMENT_LIFECYCLE_ACTION_MAP: Record<string, string> = {
  approve: "approved",
  activate: "effective",
  expire: "expired",
  archive: "archived",
};

export const EPNE_MAX_HIERARCHY_DEPTH = 100;
