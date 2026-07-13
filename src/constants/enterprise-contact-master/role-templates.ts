/**
 * Configurable MIR + optional fields + contextual business actions per role.
 * Administrators can change these templates without UI code changes.
 */

import type { EcmContactRole } from "@/types/enterprise-contact-master";
import type { EcmMasterDomain } from "./masters";
import { getEcmRoleLabel, type EcmRoleWorkspaceTabId } from "./lifecycle";

export type EcmFieldControl = "text" | "master" | "number" | "textarea" | "contact_ref";

export interface EcmConfigurableField {
  key: string;
  label: string;
  control: EcmFieldControl;
  /** When control === master */
  masterDomain?: EcmMasterDomain;
  /** Cascades options from another field value (parent master id) */
  parentFieldKey?: string;
  /** Auto-fill from selected master option meta */
  inheritMetaKeys?: string[];
  mandatory: boolean;
  sortOrder: number;
  defaultValue?: string;
  helpText?: string;
  placeholder?: string;
  validation?: {
    minLength?: number;
    pattern?: string;
  };
  visible: boolean;
}

export type EcmBusinessActionId =
  | "start_loan_journey"
  | "start_investment"
  | "create_referral"
  | "add_project"
  | "link_lender"
  | "create_user_account"
  | "manage_ca_engagement";

export interface EcmRoleBusinessAction {
  id: EcmBusinessActionId;
  label: string;
  description: string;
  /** Only show when MIR is complete */
  requiresMirComplete: boolean;
  href?: string;
  enabled: boolean;
}

export interface EcmRoleWorkspaceTemplate {
  roleCode: EcmContactRole;
  workspaceTabId: EcmRoleWorkspaceTabId;
  fields: readonly EcmConfigurableField[];
  businessActions: readonly EcmRoleBusinessAction[];
}

export const ECM_ROLE_WORKSPACE_TEMPLATES: readonly EcmRoleWorkspaceTemplate[] = [
  {
    roleCode: "customer",
    workspaceTabId: "borrower",
    fields: [
      {
        key: "employmentType",
        label: "Employment Type",
        control: "master",
        masterDomain: "employment_type",
        mandatory: true,
        sortOrder: 1,
        visible: true,
        helpText: "Minimum requirement to start a loan journey.",
      },
      {
        key: "occupation",
        label: "Occupation",
        control: "master",
        masterDomain: "occupation",
        mandatory: true,
        sortOrder: 2,
        visible: true,
      },
      {
        key: "income",
        label: "Monthly Income",
        control: "number",
        mandatory: true,
        sortOrder: 3,
        visible: true,
        placeholder: "₹ amount",
      },
      {
        key: "loanPurpose",
        label: "Loan Purpose",
        control: "master",
        masterDomain: "loan_purpose",
        mandatory: true,
        sortOrder: 4,
        visible: true,
      },
      {
        key: "preferredProduct",
        label: "Preferred Product",
        control: "master",
        masterDomain: "product",
        mandatory: false,
        sortOrder: 10,
        visible: true,
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        inheritMetaKeys: ["state"],
      },
      {
        key: "industry",
        label: "Industry",
        control: "master",
        masterDomain: "industry",
        mandatory: false,
        sortOrder: 12,
        visible: true,
      },
      {
        key: "employerName",
        label: "Employer / Business Name",
        control: "text",
        mandatory: false,
        sortOrder: 13,
        visible: true,
      },
      {
        key: "existingBanking",
        label: "Existing Banking Relationship",
        control: "master",
        masterDomain: "lender",
        mandatory: false,
        sortOrder: 14,
        visible: true,
      },
      {
        key: "relationshipManager",
        label: "Relationship Manager",
        control: "master",
        masterDomain: "relationship_manager",
        mandatory: false,
        sortOrder: 15,
        visible: true,
      },
    ],
    businessActions: [
      {
        id: "start_loan_journey",
        label: "+ Start Loan Journey",
        description: "Create a Loan File pre-populated from Contact + Borrower MIR.",
        requiresMirComplete: true,
        href: "/loan-files",
        enabled: true,
      },
    ],
  },
  {
    roleCode: "investor",
    workspaceTabId: "investor",
    fields: [
      {
        key: "investmentHorizon",
        label: "Investment Horizon",
        control: "master",
        masterDomain: "investment_horizon",
        mandatory: true,
        sortOrder: 1,
        visible: true,
      },
      {
        key: "riskAppetite",
        label: "Risk Appetite",
        control: "master",
        masterDomain: "risk_appetite",
        mandatory: true,
        sortOrder: 2,
        visible: true,
      },
      {
        key: "ticketSize",
        label: "Typical Ticket Size",
        control: "text",
        mandatory: true,
        sortOrder: 3,
        visible: true,
        placeholder: "₹25L+",
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 10,
        visible: true,
      },
      {
        key: "notes",
        label: "Notes",
        control: "textarea",
        mandatory: false,
        sortOrder: 11,
        visible: true,
      },
    ],
    businessActions: [
      {
        id: "start_investment",
        label: "+ Start Investment",
        description: "Begin an investment journey for this contact.",
        requiresMirComplete: true,
        enabled: true,
      },
    ],
  },
  {
    roleCode: "builder",
    workspaceTabId: "builder",
    fields: [
      {
        key: "builderCompany",
        label: "Builder Company",
        control: "master",
        masterDomain: "builder_company",
        mandatory: true,
        sortOrder: 1,
        visible: true,
        inheritMetaKeys: ["city", "website"],
      },
      {
        key: "projectName",
        label: "Project Name",
        control: "text",
        mandatory: true,
        sortOrder: 2,
        visible: true,
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: true,
        sortOrder: 3,
        visible: true,
      },
      {
        key: "officeAddress",
        label: "Office Address",
        control: "textarea",
        mandatory: false,
        sortOrder: 10,
        visible: true,
      },
      {
        key: "website",
        label: "Website",
        control: "text",
        mandatory: false,
        sortOrder: 11,
        visible: true,
      },
      {
        key: "notes",
        label: "Notes",
        control: "textarea",
        mandatory: false,
        sortOrder: 12,
        visible: true,
      },
    ],
    businessActions: [
      {
        id: "add_project",
        label: "+ Add Project",
        description: "Register a project linked to this builder contact.",
        requiresMirComplete: true,
        enabled: true,
      },
    ],
  },
  {
    roleCode: "chartered_accountant",
    workspaceTabId: "ca",
    fields: [
      {
        key: "membershipNo",
        label: "Membership Number",
        control: "text",
        mandatory: true,
        sortOrder: 1,
        visible: true,
      },
      {
        key: "specialization",
        label: "Specialization",
        control: "master",
        masterDomain: "specialization",
        mandatory: true,
        sortOrder: 2,
        visible: true,
      },
      {
        key: "firmName",
        label: "Firm Name",
        control: "text",
        mandatory: false,
        sortOrder: 10,
        visible: true,
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 11,
        visible: true,
      },
    ],
    businessActions: [
      {
        id: "manage_ca_engagement",
        label: "+ Manage Engagement",
        description: "Continue CA engagement workflows.",
        requiresMirComplete: true,
        enabled: true,
      },
    ],
  },
  {
    roleCode: "employee",
    workspaceTabId: "employee",
    fields: [
      {
        key: "department",
        label: "Department",
        control: "master",
        masterDomain: "department",
        mandatory: true,
        sortOrder: 1,
        visible: true,
      },
      {
        key: "designation",
        label: "Designation",
        control: "master",
        masterDomain: "designation",
        mandatory: true,
        sortOrder: 2,
        visible: true,
      },
      {
        key: "employeeCode",
        label: "Employee Code",
        control: "text",
        mandatory: true,
        sortOrder: 3,
        visible: true,
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 10,
        visible: true,
      },
    ],
    businessActions: [
      {
        id: "create_user_account",
        label: "+ Create User Account",
        description: "Provision platform access for this employee.",
        requiresMirComplete: true,
        enabled: true,
      },
    ],
  },
  {
    roleCode: "lender_employee",
    workspaceTabId: "lender_employee",
    fields: [
      {
        key: "institution",
        label: "Institution (Lender)",
        control: "master",
        masterDomain: "lender",
        mandatory: true,
        sortOrder: 1,
        visible: true,
        helpText: "Organizational root — Institution → Region → City → Branch.",
      },
      {
        key: "region",
        label: "Region",
        control: "master",
        masterDomain: "region",
        parentFieldKey: "institution",
        mandatory: true,
        sortOrder: 2,
        visible: true,
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: true,
        sortOrder: 3,
        visible: true,
      },
      {
        key: "branch",
        label: "Branch",
        control: "master",
        masterDomain: "branch",
        parentFieldKey: "institution",
        mandatory: true,
        sortOrder: 4,
        visible: true,
      },
      {
        key: "designation",
        label: "Designation",
        control: "master",
        masterDomain: "designation",
        mandatory: true,
        sortOrder: 5,
        visible: true,
        helpText: "Title only — reporting depth comes from Reporting Manager links.",
      },
      {
        key: "officialMobile",
        label: "Official Mobile",
        control: "text",
        mandatory: true,
        sortOrder: 6,
        visible: true,
        helpText: "Defaults from Contact primary mobile when blank.",
      },
      {
        key: "reportingManagerContactId",
        label: "Reporting Manager",
        control: "contact_ref",
        mandatory: false,
        sortOrder: 7,
        visible: true,
        helpText:
          "Search existing Contacts or create a basic Contact. Hierarchy is derived from this link — never hardcoded.",
      },
      {
        key: "officialEmail",
        label: "Official Email",
        control: "text",
        mandatory: false,
        sortOrder: 10,
        visible: true,
        helpText: "Defaults from Contact email when blank.",
      },
    ],
    businessActions: [
      {
        id: "link_lender",
        label: "+ Link to Lender / Manage Relationship",
        description: "Open lender relationship management.",
        requiresMirComplete: true,
        href: "/lenders",
        enabled: true,
      },
    ],
  },
  {
    roleCode: "partner",
    workspaceTabId: "partner",
    fields: [
      {
        key: "partnerCategory",
        label: "Partner Category",
        control: "master",
        masterDomain: "partner_category",
        mandatory: true,
        sortOrder: 1,
        visible: true,
      },
      {
        key: "channelType",
        label: "Channel Type",
        control: "master",
        masterDomain: "channel_type",
        mandatory: true,
        sortOrder: 2,
        visible: true,
      },
      {
        key: "partnerFirm",
        label: "Partner Firm",
        control: "text",
        mandatory: true,
        sortOrder: 3,
        visible: true,
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 10,
        visible: true,
      },
      {
        key: "coverageCities",
        label: "Coverage Cities",
        control: "text",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        placeholder: "Mumbai, Thane",
      },
    ],
    businessActions: [
      {
        id: "create_referral",
        label: "+ Create Referral",
        description: "Capture a referral from this partner.",
        requiresMirComplete: true,
        enabled: true,
      },
    ],
  },
];

export function getEcmRoleWorkspaceTemplate(
  roleCode: EcmContactRole,
): EcmRoleWorkspaceTemplate | undefined {
  return ECM_ROLE_WORKSPACE_TEMPLATES.find((t) => t.roleCode === roleCode);
}

export function getVisibleMirFields(roleCode: EcmContactRole): EcmConfigurableField[] {
  const template = getEcmRoleWorkspaceTemplate(roleCode);
  if (!template) return [];
  return template.fields
    .filter((f) => f.visible && f.mandatory)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getVisibleOptionalFields(roleCode: EcmContactRole): EcmConfigurableField[] {
  const template = getEcmRoleWorkspaceTemplate(roleCode);
  if (!template) return [];
  return template.fields
    .filter((f) => f.visible && !f.mandatory)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isEcmRoleMirComplete(
  roleCode: EcmContactRole,
  values: Record<string, string>,
): boolean {
  return getVisibleMirFields(roleCode).every((field) => Boolean(values[field.key]?.trim()));
}

export type EcmRoleProgressStatus = "not_started" | "in_progress" | "complete";

/** MIR-based role completion (0–100). */
export function getEcmRoleCompletionPct(
  roleCode: EcmContactRole,
  values: Record<string, string>,
): number {
  const mir = getVisibleMirFields(roleCode);
  if (mir.length === 0) return 100;
  const filled = mir.filter((field) => Boolean(values[field.key]?.trim())).length;
  return Math.round((filled / mir.length) * 100);
}

export function getEcmRoleProgressStatus(pct: number): EcmRoleProgressStatus {
  if (pct <= 0) return "not_started";
  if (pct >= 100) return "complete";
  return "in_progress";
}

export function getEcmRoleStatusLabel(status: EcmRoleProgressStatus): string {
  if (status === "complete") return "Complete";
  if (status === "in_progress") return "In Progress";
  return "Not Started";
}

/** Dashboard next-action label — switches to business journey when MIR is 100%. */
export function getEcmRoleDashboardActionLabel(
  roleCode: EcmContactRole,
  values: Record<string, string>,
): string {
  const label = getEcmRoleLabel(roleCode);
  const pct = getEcmRoleCompletionPct(roleCode, values);
  if (pct <= 0) return `Configure ${label}`;
  if (pct < 100) return `Continue ${label} Profile`;
  const action = getEcmRoleWorkspaceTemplate(roleCode)?.businessActions.find((a) => a.enabled);
  return action?.label?.replace(/^\+\s*/, "") ?? `Continue ${label}`;
}

/** Overall Contact Readiness across assigned roles (identity assumed established). */
export function getEcmContactReadinessPct(
  assignedRoles: EcmContactRole[],
  roleProfiles: Partial<Record<EcmContactRole, Record<string, string>>> | undefined,
): number {
  if (assignedRoles.length === 0) return 100;
  const sum = assignedRoles.reduce((acc, role) => {
    return acc + getEcmRoleCompletionPct(role, roleProfiles?.[role] ?? {});
  }, 0);
  return Math.round(sum / assignedRoles.length);
}
