/**
 * Loan Structure Role Master — configuration SSOT for drawer groups and builder roles.
 * UI must not hardcode participant roles; consume this master.
 */

export const LOAN_STRUCTURE_ROLE_MASTER_VERSION = "1.0.0";

export type LoanStructureRoleCode =
  | "primary_applicant"
  | "co_applicant"
  | "guarantor"
  | "company"
  | "property"
  | "income_contributor"
  | "authorized_signatory"
  | "existing_lender"
  | "payee"
  | "other";

export type LoanStructureRoleGroup =
  | "borrower"
  | "co_applicants"
  | "guarantors"
  | "companies"
  | "properties"
  | "income_contributors"
  | "authorized_signatories"
  | "existing_lenders"
  | "payee";

export interface LoanStructureRoleDefinition {
  code: LoanStructureRoleCode;
  label: string;
  /** Drawer section this role belongs to. */
  group: LoanStructureRoleGroup;
  groupLabel: string;
  groupSortOrder: number;
  /** Assignable in Loan Structure Builder (properties / lenders may be derived). */
  assignableInBuilder: boolean;
  /** Default entity type when assigning. */
  defaultEntityType: "individual" | "company" | "property" | "lender";
  /** Maps to ERW relationship type code when syncing. */
  erwRelationshipCode?: string;
  enabled: boolean;
  sortOrder: number;
  description?: string;
}

export const LOAN_STRUCTURE_ROLE_MASTER: readonly LoanStructureRoleDefinition[] = [
  {
    code: "primary_applicant",
    label: "Borrower",
    group: "borrower",
    groupLabel: "Borrower",
    groupSortOrder: 10,
    assignableInBuilder: true,
    defaultEntityType: "individual",
    erwRelationshipCode: "customer",
    enabled: true,
    sortOrder: 10,
    description: "Primary applicant for the loan transaction",
  },
  {
    code: "co_applicant",
    label: "Co-Applicant",
    group: "co_applicants",
    groupLabel: "Co-Applicants",
    groupSortOrder: 20,
    assignableInBuilder: true,
    defaultEntityType: "individual",
    erwRelationshipCode: "co_applicant",
    enabled: true,
    sortOrder: 20,
  },
  {
    code: "guarantor",
    label: "Guarantor",
    group: "guarantors",
    groupLabel: "Guarantors",
    groupSortOrder: 30,
    assignableInBuilder: true,
    defaultEntityType: "individual",
    erwRelationshipCode: "guarantor",
    enabled: true,
    sortOrder: 30,
  },
  {
    code: "company",
    label: "Company",
    group: "companies",
    groupLabel: "Companies",
    groupSortOrder: 40,
    assignableInBuilder: true,
    defaultEntityType: "company",
    erwRelationshipCode: "director",
    enabled: true,
    sortOrder: 40,
  },
  {
    code: "property",
    label: "Property",
    group: "properties",
    groupLabel: "Properties",
    groupSortOrder: 50,
    assignableInBuilder: false,
    defaultEntityType: "property",
    enabled: true,
    sortOrder: 50,
  },
  {
    code: "income_contributor",
    label: "Income Contributor",
    group: "income_contributors",
    groupLabel: "Income Contributors",
    groupSortOrder: 60,
    assignableInBuilder: true,
    defaultEntityType: "individual",
    erwRelationshipCode: "family",
    enabled: true,
    sortOrder: 60,
  },
  {
    code: "authorized_signatory",
    label: "Authorised Signatory",
    group: "authorized_signatories",
    groupLabel: "Authorised Signatories",
    groupSortOrder: 70,
    assignableInBuilder: true,
    defaultEntityType: "individual",
    erwRelationshipCode: "authorized_signatory",
    enabled: true,
    sortOrder: 70,
  },
  {
    code: "existing_lender",
    label: "Existing Lender",
    group: "existing_lenders",
    groupLabel: "Existing Lenders",
    groupSortOrder: 80,
    assignableInBuilder: false,
    defaultEntityType: "lender",
    erwRelationshipCode: "existing_lender",
    enabled: true,
    sortOrder: 80,
  },
  {
    code: "payee",
    label: "Payee",
    group: "payee",
    groupLabel: "Payee",
    groupSortOrder: 15,
    assignableInBuilder: false,
    defaultEntityType: "individual",
    erwRelationshipCode: "customer",
    enabled: true,
    sortOrder: 15,
    description: "Single disbursement recipient for the loan transaction",
  },
  {
    code: "other",
    label: "Participant",
    group: "co_applicants",
    groupLabel: "Co-Applicants",
    groupSortOrder: 20,
    assignableInBuilder: true,
    defaultEntityType: "individual",
    erwRelationshipCode: "other",
    enabled: true,
    sortOrder: 90,
  },
] as const;

export function getEnabledLoanStructureRoles(): LoanStructureRoleDefinition[] {
  return LOAN_STRUCTURE_ROLE_MASTER.filter((r) => r.enabled).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function getAssignableLoanStructureRoles(): LoanStructureRoleDefinition[] {
  return getEnabledLoanStructureRoles().filter((r) => r.assignableInBuilder);
}

export function getLoanStructureRole(
  code: string,
): LoanStructureRoleDefinition | undefined {
  return LOAN_STRUCTURE_ROLE_MASTER.find((r) => r.code === code);
}

export function getLoanStructureRoleLabel(code: string): string {
  return getLoanStructureRole(code)?.label ?? code.replace(/_/g, " ");
}

export function listLoanStructureGroups(): {
  group: LoanStructureRoleGroup;
  label: string;
  sortOrder: number;
}[] {
  const map = new Map<
    LoanStructureRoleGroup,
    { group: LoanStructureRoleGroup; label: string; sortOrder: number }
  >();
  for (const role of getEnabledLoanStructureRoles()) {
    if (!map.has(role.group)) {
      map.set(role.group, {
        group: role.group,
        label: role.groupLabel,
        sortOrder: role.groupSortOrder,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}
