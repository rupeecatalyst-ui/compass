/**
 * CO-WP-ACCESS-001 — Wealth Partner Access & Entitlements (development sprint).
 * Catalyst One decides · Partner Gateway enforces · Wealth Partner App presents.
 */

export const PARTNER_EXECUTION_MODES = [
  "referral",
  "joint_execution",
  "solo",
] as const;

export type PartnerExecutionMode = (typeof PARTNER_EXECUTION_MODES)[number];

export const PARTNER_ENTITLEMENT_ACTIONS = [
  "view",
  "create",
  "edit",
  "stage_change",
  "document_upload",
  "document_edit",
  "activity_add",
] as const;

export type PartnerEntitlementAction = (typeof PARTNER_ENTITLEMENT_ACTIONS)[number];

export const PARTNER_ENTITLEMENT_ACTION_LABELS: Record<PartnerEntitlementAction, string> = {
  view: "View transactions",
  create: "Create opportunities",
  edit: "Edit transaction details",
  stage_change: "Change stage",
  document_upload: "Upload documents",
  document_edit: "Edit documents",
  activity_add: "Add activity / notepad",
};

export const PARTNER_EXECUTION_MODE_LABELS: Record<PartnerExecutionMode, string> = {
  referral: "Referral",
  joint_execution: "Joint Execution",
  solo: "Solo",
};

/** Module visibility flags projected to Partner App (presentation). */
export const PARTNER_MODULE_KEYS = [
  "home",
  "business",
  "customers",
  "documents",
  "saarthi",
  "notifications",
  "private",
  "commercials",
  "performance",
] as const;

export type PartnerModuleKey = (typeof PARTNER_MODULE_KEYS)[number];

export type PartnerPermissionMap = Record<PartnerEntitlementAction, boolean>;

export type PartnerModuleVisibilityMap = Record<PartnerModuleKey, boolean>;

export function emptyPermissionMap(all = false): PartnerPermissionMap {
  return {
    view: all,
    create: all,
    edit: all,
    stage_change: all,
    document_upload: all,
    document_edit: all,
    activity_add: all,
  };
}

export function emptyModuleVisibility(all = true): PartnerModuleVisibilityMap {
  return {
    home: all,
    business: all,
    customers: all,
    documents: all,
    saarthi: all,
    notifications: all,
    private: all,
    commercials: all,
    performance: all,
  };
}

/** System template codes — defaults only; editable by admins. */
export const PARTNER_ENTITLEMENT_TEMPLATE_CODES = {
  REFERRAL_PARTNER: "REFERRAL_PARTNER",
  JOINT_EXECUTION_PARTNER: "JOINT_EXECUTION_PARTNER",
  SOLO_PARTNER: "SOLO_PARTNER",
} as const;

export const PARTNER_ENTITLEMENT_TEMPLATE_SEEDS: Array<{
  code: string;
  label: string;
  description: string;
  executionMode: PartnerExecutionMode;
  permissions: PartnerPermissionMap;
  modules: PartnerModuleVisibilityMap;
}> = [
  {
    code: PARTNER_ENTITLEMENT_TEMPLATE_CODES.REFERRAL_PARTNER,
    label: "Referral Partner",
    description:
      "Partner sourced the transaction; Rupee Catalyst executes. View + Activity by default.",
    executionMode: "referral",
    permissions: {
      view: true,
      create: true,
      edit: false,
      stage_change: false,
      document_upload: false,
      document_edit: false,
      activity_add: true,
    },
    modules: emptyModuleVisibility(true),
  },
  {
    code: PARTNER_ENTITLEMENT_TEMPLATE_CODES.JOINT_EXECUTION_PARTNER,
    label: "Joint Execution Partner",
    description:
      "Partner and Rupee Catalyst jointly execute. Configurable execution rights.",
    executionMode: "joint_execution",
    permissions: {
      view: true,
      create: true,
      edit: true,
      stage_change: true,
      document_upload: true,
      document_edit: true,
      activity_add: true,
    },
    modules: emptyModuleVisibility(true),
  },
  {
    code: PARTNER_ENTITLEMENT_TEMPLATE_CODES.SOLO_PARTNER,
    label: "Solo Partner",
    description:
      "Partner executes within permitted enterprise workflow. Still subject to entitlements.",
    executionMode: "solo",
    permissions: {
      view: true,
      create: true,
      edit: true,
      stage_change: true,
      document_upload: true,
      document_edit: false,
      activity_add: true,
    },
    modules: emptyModuleVisibility(true),
  },
];

export const PARTNER_FORBIDDEN_INTERNAL_MODULES = [
  "credit_workbench",
  "credit_risk_engine",
  "internal_underwriting",
  "enterprise_intelligence",
  "internal_ops_controls",
  "other_partners_business",
  "internal_employee_directory",
] as const;
