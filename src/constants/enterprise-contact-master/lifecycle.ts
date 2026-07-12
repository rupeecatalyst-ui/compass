import type { EcmContactRole } from "@/types/enterprise-contact-master";

export const ECM_FRAMEWORK_VERSION = "1.1.0-cert-r1";

export const ECM_CONTACT_ROLES = {
  CUSTOMER: "customer",
  EMPLOYEE: "employee",
  LENDER_EMPLOYEE: "lender_employee",
  PARTNER: "partner",
  INVESTOR: "investor",
  BUILDER: "builder",
  CHARTERED_ACCOUNTANT: "chartered_accountant",
} as const satisfies Record<string, EcmContactRole>;

/** Fixed identity / operational tabs (always available once a contact exists) */
export type EcmFixedWorkspaceTabId =
  | "identity"
  | "documents"
  | "timeline"
  | "communication"
  | "audit";

export type EcmRoleWorkspaceTabId =
  | "borrower"
  | "employee"
  | "lender_employee"
  | "partner"
  | "investor"
  | "builder"
  | "ca";

export type EcmWorkspaceTabId = EcmFixedWorkspaceTabId | EcmRoleWorkspaceTabId;

export interface EcmRoleMasterDefinition {
  code: EcmContactRole;
  label: string;
  /** Dynamic workspace tab activated when this role is assigned */
  workspaceTabId: EcmRoleWorkspaceTabId;
  workspaceTabLabel: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
}

/**
 * Role Master — configuration source for unlimited multi-role assignment
 * and dynamic Contact Workspace tabs. Future roles = config only.
 */
export const ECM_ROLE_MASTER: readonly EcmRoleMasterDefinition[] = [
  {
    code: "customer",
    label: "Borrower",
    workspaceTabId: "borrower",
    workspaceTabLabel: "Borrower",
    description: "Borrowing / applicant relationship",
    enabled: true,
    sortOrder: 1,
  },
  {
    code: "investor",
    label: "Investor",
    workspaceTabId: "investor",
    workspaceTabLabel: "Investor",
    description: "Investment relationship",
    enabled: true,
    sortOrder: 2,
  },
  {
    code: "builder",
    label: "Builder",
    workspaceTabId: "builder",
    workspaceTabLabel: "Builder",
    description: "Builder / developer relationship",
    enabled: true,
    sortOrder: 3,
  },
  {
    code: "chartered_accountant",
    label: "CA",
    workspaceTabId: "ca",
    workspaceTabLabel: "CA",
    description: "Chartered accountant relationship",
    enabled: true,
    sortOrder: 4,
  },
  {
    code: "employee",
    label: "Employee",
    workspaceTabId: "employee",
    workspaceTabLabel: "Employee",
    description: "Internal employee",
    enabled: true,
    sortOrder: 5,
  },
  {
    code: "lender_employee",
    label: "Banker",
    workspaceTabId: "lender_employee",
    workspaceTabLabel: "Banker",
    description: "Lender institution employee",
    enabled: true,
    sortOrder: 6,
  },
  {
    code: "partner",
    label: "Partner",
    workspaceTabId: "partner",
    workspaceTabLabel: "Partner",
    description: "Channel / business partner",
    enabled: true,
    sortOrder: 7,
  },
] as const;

export interface EcmFixedWorkspaceTabDefinition {
  id: EcmFixedWorkspaceTabId;
  label: string;
  sortOrder: number;
  /** identity shows before roles; others after role tabs */
  placement: "before_roles" | "after_roles";
}

export const ECM_FIXED_WORKSPACE_TABS: readonly EcmFixedWorkspaceTabDefinition[] = [
  { id: "identity", label: "Identity", sortOrder: 0, placement: "before_roles" },
  { id: "documents", label: "Documents", sortOrder: 90, placement: "after_roles" },
  { id: "timeline", label: "Timeline", sortOrder: 91, placement: "after_roles" },
  { id: "communication", label: "Communication", sortOrder: 92, placement: "after_roles" },
  { id: "audit", label: "Audit", sortOrder: 93, placement: "after_roles" },
];

/** Configuration-driven Contact Score weights (grid displays calculated value only) */
export const ECM_CONTACT_SCORE_CONFIG = {
  base: 40,
  hasPersonalEmail: 12,
  hasOfficialEmail: 12,
  hasSecondaryMobile: 8,
  perRole: 6,
  maxRolesContribution: 24,
  activeStatus: 10,
  ceiling: 100,
} as const;

export function getEnabledEcmRoleMaster(): EcmRoleMasterDefinition[] {
  return ECM_ROLE_MASTER.filter((r) => r.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEcmRoleDefinition(code: EcmContactRole): EcmRoleMasterDefinition | undefined {
  return ECM_ROLE_MASTER.find((r) => r.code === code);
}

export function getEcmRoleLabel(code: EcmContactRole): string {
  return getEcmRoleDefinition(code)?.label ?? code.replace(/_/g, " ");
}
