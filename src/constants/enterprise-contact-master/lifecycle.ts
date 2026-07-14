import type { EcmContactRole } from "@/types/enterprise-contact-master";

export const ECM_FRAMEWORK_VERSION = "1.9.1-cf-chanakya-001";

export const ECM_CONTACT_ROLES = {
  CUSTOMER: "customer",
  EMPLOYEE: "employee",
  LENDER_EMPLOYEE: "lender_employee",
  PARTNER: "partner",
  INVESTOR: "investor",
  BUILDER: "builder",
  CHARTERED_ACCOUNTANT: "chartered_accountant",
} as const satisfies Record<string, EcmContactRole>;

/**
 * Fixed workspace tabs for Contact onboarding.
 * Documents / Timeline / Communication / Audit live on journey/entity workspaces — not here.
 */
export type EcmFixedWorkspaceTabId = "identity";

export type EcmRoleWorkspaceTabId =
  | "borrower"
  | "employee"
  | "lender_employee"
  | "partner"
  | "investor"
  | "builder"
  | "ca";

export type EcmWorkspaceTabId = EcmFixedWorkspaceTabId | EcmRoleWorkspaceTabId;

export interface EcmRoleSpecificField {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
}

export interface EcmRoleMasterDefinition {
  code: EcmContactRole;
  label: string;
  /** Dynamic workspace tab activated when this role is assigned */
  workspaceTabId: EcmRoleWorkspaceTabId;
  workspaceTabLabel: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
  /** Role-only fields — identity is never re-collected here */
  roleSpecificFields: readonly EcmRoleSpecificField[];
  /** Subtle chip accent token */
  chipTone: "teal" | "indigo" | "amber" | "rose" | "slate" | "violet" | "sky";
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
    chipTone: "teal",
    roleSpecificFields: [
      { key: "employmentType", label: "Employment Type", placeholder: "Salaried / Self-Employed…" },
      { key: "occupation", label: "Profession / Occupation", placeholder: "Depends on Employment Type" },
      // Resident Status: system-defaulted (Resident Indian) until ECC enables NRI/OCI variants (CF-CON-041)
    ],
  },
  {
    code: "investor",
    label: "Investor",
    workspaceTabId: "investor",
    workspaceTabLabel: "Investor",
    description: "Investment relationship",
    enabled: true,
    sortOrder: 2,
    chipTone: "indigo",
    roleSpecificFields: [
      { key: "investmentHorizon", label: "Investment Horizon", placeholder: "3–5 years" },
      { key: "riskAppetite", label: "Risk Appetite", placeholder: "Moderate" },
      { key: "ticketSize", label: "Typical Ticket Size", placeholder: "₹25L+" },
    ],
  },
  {
    code: "builder",
    label: "Builder",
    workspaceTabId: "builder",
    workspaceTabLabel: "Builder",
    description: "Builder / developer relationship",
    enabled: true,
    sortOrder: 3,
    chipTone: "amber",
    roleSpecificFields: [
      { key: "firmName", label: "Firm / Project Name", placeholder: "Skyline Developers" },
      { key: "reraId", label: "RERA ID", placeholder: "Optional" },
      { key: "primaryMarket", label: "Primary Market", placeholder: "Pune" },
    ],
  },
  {
    code: "chartered_accountant",
    label: "CA",
    workspaceTabId: "ca",
    workspaceTabLabel: "CA",
    description: "Chartered accountant relationship",
    enabled: true,
    sortOrder: 4,
    chipTone: "violet",
    roleSpecificFields: [
      { key: "membershipNo", label: "Membership Number", placeholder: "ICAI membership" },
      { key: "firmName", label: "Firm Name", placeholder: "Rao & Associates" },
      { key: "specialization", label: "Specialization", placeholder: "Tax / Audit" },
    ],
  },
  {
    code: "employee",
    label: "Employee",
    workspaceTabId: "employee",
    workspaceTabLabel: "Employee",
    description: "Internal employee",
    enabled: true,
    sortOrder: 5,
    chipTone: "slate",
    roleSpecificFields: [
      { key: "department", label: "Department", placeholder: "Sales" },
      { key: "designation", label: "Designation", placeholder: "Relationship Manager" },
    ],
  },
  {
    code: "lender_employee",
    label: "Banker",
    workspaceTabId: "lender_employee",
    workspaceTabLabel: "Banker",
    description: "Lender institution employee",
    enabled: true,
    sortOrder: 6,
    chipTone: "sky",
    roleSpecificFields: [
      { key: "institution", label: "Institution", placeholder: "HDFC Bank" },
      { key: "city", label: "City", placeholder: "Mumbai" },
      { key: "branch", label: "Branch", placeholder: "Bandra West" },
      { key: "designation", label: "Designation", placeholder: "Relationship Manager" },
      { key: "officialMobile", label: "Official Mobile", placeholder: "Mobile" },
    ],
  },
  {
    code: "partner",
    label: "Partner",
    workspaceTabId: "partner",
    workspaceTabLabel: "Partner",
    description: "Channel / business partner",
    enabled: true,
    sortOrder: 7,
    chipTone: "rose",
    roleSpecificFields: [
      { key: "partnerFirm", label: "Partner Firm", placeholder: "Firm name" },
      { key: "channelType", label: "Channel Type", placeholder: "DSA / Connector" },
      { key: "coverageCities", label: "Coverage Cities", placeholder: "Mumbai, Thane" },
    ],
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
