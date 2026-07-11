/**
 * EIAE identity type constants.
 */

import type { EiaeIdentityType } from "@/types/enterprise-identity-access-engine";

export const EIAE_IDENTITY_TYPES = {
  INTERNAL_USER: "internal_user",
  EXTERNAL_USER: "external_user",
  EMPLOYEE: "employee",
  CUSTOMER: "customer",
  WEALTH_PARTNER: "wealth_partner",
  BUILDER_PARTNER: "builder_partner",
  LENDER_EMPLOYEE: "lender_employee",
} as const;

export const EIAE_IDENTITY_TYPE_LIST: EiaeIdentityType[] = Object.values(EIAE_IDENTITY_TYPES);

export const EIAE_IDENTITY_TYPE_LABELS: Record<EiaeIdentityType, string> = {
  internal_user: "Internal User",
  external_user: "External User",
  employee: "Employee",
  customer: "Customer",
  wealth_partner: "Wealth Partner",
  builder_partner: "Builder Partner",
  lender_employee: "Lender Employee",
};

export const EIAE_IDENTITY_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
  ARCHIVED: "archived",
} as const;

export const EIAE_IDENTITY_LIFECYCLE_ACTIONS = {
  CREATE: "create",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
  SUSPEND: "suspend",
  ARCHIVE: "archive",
} as const;
