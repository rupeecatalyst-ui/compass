export const LIFE_FRAMEWORK_VERSION = "1.2.0-cf-chanakya-001";

export const LIFE_CONTACT_ROLES = {
  LENDER_EXECUTOR: "lender_executor",
  CREDIT: "credit",
  OPERATIONS: "operations",
  POLICY: "policy",
  RELATIONSHIP_MANAGER: "relationship_manager",
  OTHER: "other",
} as const;

export const LIFE_ACTIVE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const;

/** Roles excluded from auto-selection unless lenderExecutor is explicitly true. */
export const LIFE_EXCLUDED_ROLES_UNLESS_EXECUTOR = [
  LIFE_CONTACT_ROLES.CREDIT,
  LIFE_CONTACT_ROLES.OPERATIONS,
  LIFE_CONTACT_ROLES.POLICY,
] as const;
