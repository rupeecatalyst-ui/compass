/**
 * Configurable MIR + optional fields + contextual business actions per role.
 * Administrators can change these templates without UI code changes.
 *
 * CF-CDC-002 — Business Relevance Driven Data Capture:
 * Every field must answer Why / When / Who. Irrelevant fields are not rendered.
 */

import type { EcmContactRole } from "@/types/enterprise-contact-master";
import type { EcmMasterDomain } from "./masters";
import { normalizeEcmEmploymentTypeId } from "./masters";
import { getEcmRoleLabel, type EcmRoleWorkspaceTabId } from "./lifecycle";
import {
  ECM_DEFAULT_RESIDENT_STATUS_ID,
  isEcmResidentStatusVariantsEnabled,
} from "./enterprise-features";

export type EcmFieldControl = "text" | "master" | "number" | "textarea" | "contact_ref";

/** Information ownership class — enterprise design principle CF-CDC-002. */
export type EcmFieldDataClass =
  | "identity"
  | "role"
  | "journey"
  | "derived"
  | "external";

/**
 * When to show a field. Evaluated against current role profile values.
 * If omitted, field follows `visible` only.
 */
export interface EcmFieldRelevanceRule {
  /** Show only when `whenField` equals one of `whenValues` (after employment normalize). */
  whenField?: string;
  whenValues?: readonly string[];
  /** Hide when `hideWhenField` equals one of `hideWhenValues`. */
  hideWhenField?: string;
  hideWhenValues?: readonly string[];
}

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
  /** Template-level default visibility (false = never shown / derived / journey-owned). */
  visible: boolean;
  /** Identity | Role | Journey | Derived | External */
  dataClass?: EcmFieldDataClass;
  /** Why this field exists (documentation for admins / certification). */
  why?: string;
  /** Who owns this information (role / journey / system). */
  owner?: string;
  /** Contextual show/hide rules. */
  relevance?: EcmFieldRelevanceRule;
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
  /** CF-CON-036 — replaces label when an active journey already exists */
  openLabel?: string;
  description: string;
  /** Only show when MIR is complete */
  requiresMirComplete: boolean;
  href?: string;
  /** Deep-link when opening an existing journey workspace */
  openHref?: string;
  enabled: boolean;
}

export interface EcmRoleWorkspaceTemplate {
  roleCode: EcmContactRole;
  workspaceTabId: EcmRoleWorkspaceTabId;
  fields: readonly EcmConfigurableField[];
  businessActions: readonly EcmRoleBusinessAction[];
}

const SALARIED = ["salaried"] as const;
const BUSINESS_OWNERS = ["self-employed-business", "self-employed-professional"] as const;
const SELF_EMPLOYED_BUSINESS = ["self-employed-business"] as const;

function normalizeValueForRelevance(fieldKey: string, value: string | undefined): string {
  if (!value) return "";
  if (fieldKey === "employmentType") {
    return normalizeEcmEmploymentTypeId(value) ?? value.trim().toLowerCase();
  }
  return value.trim().toLowerCase();
}

/** CF-CDC-002 — decide if a field is relevant in the current role profile context. */
export function isEcmFieldRelevant(
  field: EcmConfigurableField,
  values: Record<string, string> = {},
): boolean {
  if (!field.visible) return false;
  // CF-CON-041 — Resident Status is system-owned while only Resident Indians are enabled
  if (field.key === "residentStatus" && !isEcmResidentStatusVariantsEnabled()) {
    return false;
  }
  if (field.dataClass === "derived" || field.dataClass === "external" || field.dataClass === "journey") {
    return false;
  }
  const rule = field.relevance;
  if (!rule) return true;

  if (rule.whenField && rule.whenValues && rule.whenValues.length > 0) {
    const current = normalizeValueForRelevance(rule.whenField, values[rule.whenField]);
    const allowed = rule.whenValues.map((v) => normalizeValueForRelevance(rule.whenField!, v));
    if (!allowed.includes(current)) return false;
  }

  if (rule.hideWhenField && rule.hideWhenValues && rule.hideWhenValues.length > 0) {
    const current = normalizeValueForRelevance(rule.hideWhenField, values[rule.hideWhenField]);
    const blocked = rule.hideWhenValues.map((v) =>
      normalizeValueForRelevance(rule.hideWhenField!, v),
    );
    if (blocked.includes(current)) return false;
  }

  return true;
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
        dataClass: "role",
        owner: "Borrower Role",
        why: "Classifies how the borrower earns — drives which profile fields are relevant.",
        helpText: "Borrower profile only — loan product/amount belong to Loan Journey.",
      },
      {
        key: "occupation",
        label: "Profession / Occupation",
        control: "master",
        masterDomain: "occupation",
        parentFieldKey: "employmentType",
        mandatory: true,
        sortOrder: 2,
        visible: true,
        dataClass: "role",
        owner: "Borrower Role",
        why: "Captures profession for underwriting identity — not loan terms.",
        helpText: "Options depend on Employment Type (configurable master).",
        placeholder: "Select profession / occupation",
      },
      {
        key: "residentStatus",
        label: "Resident Status",
        control: "master",
        masterDomain: "resident_status",
        mandatory: true,
        sortOrder: 3,
        visible: true,
        defaultValue: ECM_DEFAULT_RESIDENT_STATUS_ID,
        dataClass: "role",
        owner: "System / Enterprise Configuration",
        why: "Regulatory residency class. Defaulted to Resident Indian while NRI/OCI variants are disabled in Enterprise Configuration.",
        helpText:
          "Hidden while Resident Indian–only mode is active. Exposed automatically when NRI / OCI / Foreign Resident support is enabled.",
      },
      {
        key: "employerName",
        label: "Employer Name",
        control: "text",
        mandatory: true,
        sortOrder: 10,
        visible: true,
        dataClass: "role",
        owner: "Borrower Role",
        why: "Know where a salaried customer works.",
        helpText: "Shown only for Salaried employment. Reused automatically in Loan Journey.",
        placeholder: "Employer legal name",
        relevance: { whenField: "employmentType", whenValues: SALARIED },
      },
      {
        key: "designation",
        label: "Designation",
        control: "text",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        dataClass: "role",
        owner: "Borrower Role",
        why: "Borrower identity title at employer — not a credit parameter.",
        helpText: "Optional. Captured once on Borrower Profile.",
        placeholder: "e.g. Assistant Manager",
        relevance: { whenField: "employmentType", whenValues: SALARIED },
      },
      {
        key: "businessName",
        label: "Business Name",
        control: "text",
        mandatory: true,
        sortOrder: 12,
        visible: true,
        dataClass: "role",
        owner: "Borrower Role",
        why: "Identify the business / practice for self-employed borrowers.",
        helpText: "Reused automatically in Loan Journey as Associated Company when applicable.",
        placeholder: "Business / firm name",
        relevance: { whenField: "employmentType", whenValues: BUSINESS_OWNERS },
      },
      {
        key: "industry",
        label: "Industry",
        control: "master",
        masterDomain: "industry",
        mandatory: true,
        sortOrder: 13,
        visible: true,
        dataClass: "role",
        owner: "Borrower Role",
        why: "Industry context for business-owner risk and advisory.",
        relevance: { whenField: "employmentType", whenValues: SELF_EMPLOYED_BUSINESS },
      },
      {
        key: "natureOfBusiness",
        label: "Nature of Business",
        control: "text",
        mandatory: true,
        sortOrder: 14,
        visible: true,
        dataClass: "role",
        owner: "Borrower Role",
        why: "Describe what the business does — relevant for self-employed business owners.",
        placeholder: "e.g. Wholesale trading of industrial chemicals",
        relevance: { whenField: "employmentType", whenValues: SELF_EMPLOYED_BUSINESS },
      },
      {
        key: "yearsInBusiness",
        label: "Years in Business",
        control: "number",
        mandatory: true,
        sortOrder: 15,
        visible: true,
        dataClass: "role",
        owner: "Borrower Role",
        why: "Tenure of the business for capacity and stability assessment.",
        placeholder: "Years",
        relevance: { whenField: "employmentType", whenValues: SELF_EMPLOYED_BUSINESS },
      },
    ],
    businessActions: [
      {
        id: "start_loan_journey",
        label: "Start Loan Journey",
        openLabel: "Continue Loan Journey",
        description:
          "Opens Loan Journey to capture product, amount, purpose, property and other loan-file data. Never stored on Borrower profile.",
        requiresMirComplete: true,
        href: "/loan-files",
        openHref: "/loan-files",
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
        dataClass: "role",
        owner: "Investor Role",
        why: "Investor profile preference — scheme selection belongs to Investment Journey.",
      },
      {
        key: "riskAppetite",
        label: "Risk Appetite",
        control: "master",
        masterDomain: "risk_appetite",
        mandatory: true,
        sortOrder: 2,
        visible: true,
        dataClass: "role",
        owner: "Investor Role",
        why: "Risk profile for the investor identity — not product selection.",
      },
      {
        key: "ticketSize",
        label: "Typical Ticket Size",
        control: "text",
        mandatory: true,
        sortOrder: 3,
        visible: true,
        dataClass: "role",
        owner: "Investor Role",
        why: "Capacity band for matching — scheme name is journey-owned.",
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
        dataClass: "role",
        owner: "Investor Role",
        why: "Optional location preference for investor servicing.",
      },
      {
        key: "notes",
        label: "Notes",
        control: "textarea",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        dataClass: "role",
        owner: "Investor Role",
        why: "Free-form investor profile notes.",
      },
    ],
    businessActions: [
      {
        id: "start_investment",
        label: "Start Investment Journey",
        openLabel: "Open Investment Workspace",
        description:
          "Begin Investment Journey (scheme selection and booking). Scheme Name is never collected on Investor Role.",
        requiresMirComplete: true,
        href: "/opportunities",
        openHref: "/opportunities",
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
        dataClass: "role",
        owner: "Builder Role",
        why: "Org identity for the builder contact.",
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: true,
        sortOrder: 2,
        visible: true,
        dataClass: "role",
        owner: "Builder Role",
        why: "Primary operating city for the builder relationship.",
      },
      {
        key: "officeAddress",
        label: "Office Address",
        control: "textarea",
        mandatory: false,
        sortOrder: 10,
        visible: true,
        dataClass: "role",
        owner: "Builder Role",
        why: "Optional builder office contact detail.",
      },
      {
        key: "website",
        label: "Website",
        control: "text",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        dataClass: "role",
        owner: "Builder Role",
        why: "Optional builder digital presence.",
      },
      {
        key: "notes",
        label: "Notes",
        control: "textarea",
        mandatory: false,
        sortOrder: 12,
        visible: true,
        dataClass: "role",
        owner: "Builder Role",
        why: "Free-form builder relationship notes.",
      },
    ],
    businessActions: [
      {
        id: "add_project",
        label: "Manage Builder Projects",
        openLabel: "Manage Builder Projects",
        description:
          "Register a project (project name and project details belong to the Project Journey).",
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
        dataClass: "role",
        owner: "CA Role",
        why: "Professional identity for the CA relationship.",
      },
      {
        key: "specialization",
        label: "Specialization",
        control: "master",
        masterDomain: "specialization",
        mandatory: true,
        sortOrder: 2,
        visible: true,
        dataClass: "role",
        owner: "CA Role",
        why: "Practice focus for engagement routing.",
      },
      {
        key: "firmName",
        label: "Firm Name",
        control: "text",
        mandatory: false,
        sortOrder: 10,
        visible: true,
        dataClass: "role",
        owner: "CA Role",
        why: "Optional firm affiliation.",
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        dataClass: "role",
        owner: "CA Role",
        why: "Optional practice location.",
      },
    ],
    businessActions: [
      {
        id: "manage_ca_engagement",
        label: "Start CA Engagement",
        openLabel: "Manage CA Engagement",
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
        dataClass: "role",
        owner: "Employee Role",
        why: "Internal org placement for the employee contact.",
      },
      {
        key: "designation",
        label: "Designation",
        control: "master",
        masterDomain: "designation",
        mandatory: true,
        sortOrder: 2,
        visible: true,
        dataClass: "role",
        owner: "Employee Role",
        why: "Job title for the employee relationship.",
      },
      {
        key: "employeeCode",
        label: "Employee Code",
        control: "text",
        mandatory: false,
        sortOrder: 3,
        visible: false,
        dataClass: "derived",
        owner: "System",
        why: "System-generated identifier — never manually entered.",
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 10,
        visible: true,
        dataClass: "role",
        owner: "Employee Role",
        why: "Optional work location.",
      },
    ],
    businessActions: [
      {
        id: "create_user_account",
        label: "Grant Platform Access",
        openLabel: "Continue Platform Access",
        description:
          "Provision a User Account from this Contact (never create users directly).",
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
        dataClass: "role",
        owner: "Banker Role",
        why: "Org location: Institution → Region → City → Branch.",
        helpText: "Lender Master. Org path: Institution → Region → City → Branch.",
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: true,
        sortOrder: 2,
        visible: true,
        dataClass: "role",
        owner: "Banker Role",
        why: "Banker operating city.",
      },
      {
        key: "branch",
        label: "Branch",
        control: "master",
        masterDomain: "branch",
        parentFieldKey: "institution",
        mandatory: true,
        sortOrder: 3,
        visible: true,
        dataClass: "role",
        owner: "Banker Role",
        why: "Branch affiliation for lender relationship.",
        helpText: "Branch Master — filtered by Institution when selected.",
      },
      {
        key: "designation",
        label: "Designation",
        control: "master",
        masterDomain: "designation",
        mandatory: true,
        sortOrder: 4,
        visible: true,
        dataClass: "role",
        owner: "Banker Role",
        why: "Job title only — reporting depth is relationship-derived.",
        helpText:
          "Job title only (e.g. Relationship Executive … National Manager). Reporting depth is derived from Reporting Manager links — never hardcoded.",
      },
      {
        key: "officialMobile",
        label: "Official Mobile",
        control: "text",
        mandatory: true,
        sortOrder: 5,
        visible: true,
        dataClass: "role",
        owner: "Banker Role",
        why: "Official banker contact channel.",
        helpText: "Defaults from Contact primary mobile when blank.",
      },
      {
        key: "reportingManagerContactId",
        label: "Reporting Manager",
        control: "contact_ref",
        mandatory: false,
        sortOrder: 6,
        visible: true,
        dataClass: "role",
        owner: "Banker Role",
        why: "Hierarchy via Contact Relationship (reports_to).",
        helpText:
          "Contact Lookup. Persisted as generic Contact Relationship (reports_to). Hierarchy walks dynamically; missing levels never break the chain.",
      },
      {
        key: "officialEmail",
        label: "Official Email",
        control: "text",
        mandatory: false,
        sortOrder: 10,
        visible: true,
        dataClass: "role",
        owner: "Banker Role",
        why: "Optional official email for banker.",
        helpText: "Optional. Defaults from Contact email when blank.",
      },
      {
        key: "region",
        label: "Region",
        control: "master",
        masterDomain: "region",
        parentFieldKey: "institution",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        dataClass: "role",
        owner: "Banker Role",
        why: "Optional org region under Institution.",
      },
    ],
    businessActions: [
      {
        id: "link_lender",
        label: "Link to Lender",
        openLabel: "Open Lender Workspace",
        description: "Open LIFE recommendations or a dedicated Enterprise Lender Workspace from case context.",
        requiresMirComplete: true,
        href: "/lenders",
        openHref: "/lenders",
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
        dataClass: "role",
        owner: "Partner Role",
        why: "Classify the partner channel relationship.",
      },
      {
        key: "channelType",
        label: "Channel Type",
        control: "master",
        masterDomain: "channel_type",
        mandatory: true,
        sortOrder: 2,
        visible: true,
        dataClass: "role",
        owner: "Partner Role",
        why: "How this partner originates business.",
      },
      {
        key: "partnerFirm",
        label: "Partner Firm",
        control: "text",
        mandatory: true,
        sortOrder: 3,
        visible: true,
        dataClass: "role",
        owner: "Partner Role",
        why: "Firm identity for the partner onboarding profile.",
      },
      {
        key: "city",
        label: "City",
        control: "master",
        masterDomain: "city",
        mandatory: false,
        sortOrder: 10,
        visible: true,
        dataClass: "role",
        owner: "Partner Role",
        why: "Optional primary city.",
      },
      {
        key: "coverageCities",
        label: "Coverage Cities",
        control: "text",
        mandatory: false,
        sortOrder: 11,
        visible: true,
        dataClass: "role",
        owner: "Partner Role",
        why: "Optional coverage footprint.",
        placeholder: "Mumbai, Thane",
      },
      // Bank Account is Journey/Settlement-owned — not collected at Partner Role onboarding (CF-CDC-002).
    ],
    businessActions: [
      {
        id: "create_referral",
        label: "Start Partner Onboarding",
        openLabel: "Continue Partner Onboarding",
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

/** Relevant + visible MIR fields for the current profile values (CF-CDC-002). */
export function getVisibleMirFields(
  roleCode: EcmContactRole,
  values: Record<string, string> = {},
): EcmConfigurableField[] {
  const template = getEcmRoleWorkspaceTemplate(roleCode);
  if (!template) return [];
  return template.fields
    .filter((f) => f.mandatory && isEcmFieldRelevant(f, values))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Relevant + visible optional fields for the current profile values (CF-CDC-002). */
export function getVisibleOptionalFields(
  roleCode: EcmContactRole,
  values: Record<string, string> = {},
): EcmConfigurableField[] {
  const template = getEcmRoleWorkspaceTemplate(roleCode);
  if (!template) return [];
  return template.fields
    .filter((f) => !f.mandatory && isEcmFieldRelevant(f, values))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isEcmRoleMirComplete(
  roleCode: EcmContactRole,
  values: Record<string, string>,
): boolean {
  return getVisibleMirFields(roleCode, values).every((field) =>
    Boolean(values[field.key]?.trim()),
  );
}

export type EcmRoleProgressStatus = "not_started" | "in_progress" | "complete";

/** MIR-based role completion (0–100) — only currently relevant mandatory fields. */
export function getEcmRoleCompletionPct(
  roleCode: EcmContactRole,
  values: Record<string, string>,
): number {
  const mir = getVisibleMirFields(roleCode, values);
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

/** CF-CON-036 — Role Workspace column only (never jumps to a business journey). */
export type EcmRoleWorkspaceDashAction = {
  kind: "configure" | "continue" | "view";
  label: string;
};

export function getEcmRoleWorkspaceDashAction(
  roleCode: EcmContactRole,
  values: Record<string, string>,
): EcmRoleWorkspaceDashAction {
  const label = getEcmRoleLabel(roleCode);
  const pct = getEcmRoleCompletionPct(roleCode, values);
  if (pct <= 0) return { kind: "configure", label: "Configure" };
  if (pct < 100) {
    const journey = getPrimaryEcmBusinessAction(roleCode);
    return {
      kind: "continue",
      label: journey?.label ?? `Continue ${label}`,
    };
  }
  return { kind: "view", label: `View ${label}` };
}

/**
 * Stored on roleProfiles when a non-loan journey is started from the dashboard
 * so subsequent visits show Open Workspace instead of Start Journey.
 */
export const ECM_ACTIVE_JOURNEY_PROFILE_KEY = "activeJourneyRef";

/** CF-CON-036 / CF-CON-041 — dedicated Business Journey column state. */
export type EcmBusinessJourneyDashAction =
  | {
      mode: "guide";
      label: string;
      guideCtaLabel: string;
      reason: string;
      actionId: EcmBusinessActionId;
    }
  | {
      mode: "start" | "open";
      label: string;
      actionId: EcmBusinessActionId;
      href?: string;
      openHref?: string;
      reason?: string;
    };

export function getPrimaryEcmBusinessAction(
  roleCode: EcmContactRole,
): EcmRoleBusinessAction | undefined {
  return getEcmRoleWorkspaceTemplate(roleCode)?.businessActions.find((a) => a.enabled);
}

export function getEcmBusinessJourneyDashAction(
  roleCode: EcmContactRole,
  values: Record<string, string>,
  options?: { hasActiveJourney?: boolean },
): EcmBusinessJourneyDashAction | null {
  const actionable = getPrimaryEcmBusinessAction(roleCode);
  if (!actionable) return null;

  const roleLabel = getEcmRoleLabel(roleCode);
  const mirComplete = isEcmRoleMirComplete(roleCode, values);
  const profileJourney = Boolean(values[ECM_ACTIVE_JOURNEY_PROFILE_KEY]?.trim());
  /** Explicit option wins (avoids stale profile journey key when loan state is known). */
  const hasActiveJourney =
    options?.hasActiveJourney !== undefined
      ? Boolean(options.hasActiveJourney)
      : profileJourney;
  const journeyName = extractBusinessJourneyName(actionable.label);

  if (!mirComplete) {
    return {
      mode: "guide",
      label: actionable.label,
      guideCtaLabel: actionable.label,
      actionId: actionable.id,
      reason: buildChanakyaJourneyGuideDetail(roleCode, journeyName),
    };
  }

  if (hasActiveJourney) {
    return {
      mode: "open",
      label: actionable.openLabel ?? actionable.label.replace(/^Start\s+/i, "Open "),
      actionId: actionable.id,
      href: actionable.href,
      openHref: actionable.openHref ?? actionable.href,
    };
  }

  return {
    mode: "start",
    label: actionable.label,
    actionId: actionable.id,
    href: actionable.href,
    openHref: actionable.openHref ?? actionable.href,
  };
}

/** CF-CHANAKYA-004 — journey name without Start/Open prefix. */
export function extractBusinessJourneyName(journeyLabel: string): string {
  return journeyLabel.replace(/^(Start|Open)\s+/i, "").trim() || "Business Journey";
}

/** CF-CHANAKYA-004 — mentor copy while MIR is incomplete (never instructional/blocking). */
export function buildChanakyaJourneyGuideDetail(
  roleCode: EcmContactRole,
  journeyName: string,
): string {
  const roleDetail = ROLE_JOURNEY_DETAIL_PHRASE[roleCode] ?? "profile";
  return `I need a few more ${roleDetail} details before I can begin the ${journeyName}.`;
}

const ROLE_JOURNEY_DETAIL_PHRASE: Partial<Record<EcmContactRole, string>> = {
  customer: "borrower",
  investor: "investor",
  partner: "partner",
  employee: "employee",
  builder: "builder",
  lender_employee: "banker",
  chartered_accountant: "CA",
};

/** CF-CHANAKYA-004 — structured Business Journey guidance copy. */
export function getChanakyaBusinessJourneyGuidanceCopy(input: {
  firstName: string;
  roleLabel: string;
  journeyLabel: string;
  mode: "guide" | "ready" | "open";
}): {
  headline: string;
  subline?: string;
  body: string;
  progressLabel?: string;
} {
  const name = input.firstName.trim() || "there";
  const journeyName = extractBusinessJourneyName(input.journeyLabel);

  if (input.mode === "guide") {
    return {
      headline: `Hi ${name},`,
      subline: "We're almost ready.",
      body: `I need a few more ${input.roleLabel.toLowerCase()} details before I can begin the ${journeyName}.`,
      progressLabel: "Progress",
    };
  }

  if (input.mode === "ready") {
    return {
      headline: `Great work ${name}.`,
      body: `Your ${input.roleLabel} Profile is complete.`,
      subline: `You can now begin the ${journeyName}.`,
    };
  }

  return {
    headline: `Hi ${name},`,
    subline: "Your journey is already underway.",
    body: `Continue in the ${journeyName} — no need to start again.`,
  };
}

/** @deprecated CF-CON-036 — use getEcmRoleWorkspaceDashAction + getEcmBusinessJourneyDashAction */
export function getEcmRoleDashboardActionLabel(
  roleCode: EcmContactRole,
  values: Record<string, string>,
): string {
  const journey = getEcmBusinessJourneyDashAction(roleCode, values);
  const workspace = getEcmRoleWorkspaceDashAction(roleCode, values);
  if (journey?.mode === "start" || journey?.mode === "open") return journey.label;
  return workspace.label;
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

/** Generate system Employee Code — derived, never user-entered (CF-CDC-002). */
export function deriveEcmEmployeeCode(contactId: string): string {
  const stamp = contactId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "NEW";
  return `EMP-${stamp}`;
}
