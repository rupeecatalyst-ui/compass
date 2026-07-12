/**
 * ECM — Enterprise Contact Master (SPR-001).
 * Multi-role contact registry with mandatory mobile and optional emails.
 */

export type EcmContactRole =
  | "customer"
  | "employee"
  | "lender_employee"
  | "partner"
  | "investor"
  | "builder"
  | "chartered_accountant";

export interface EcmContact {
  id: string;
  name: string;
  mobilePrimary: string;
  primaryRole: EcmContactRole;
  mobileSecondary?: string;
  personalEmail?: string;
  officialEmail?: string;
  additionalRoles: EcmContactRole[];
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export type EcmValidationSeverity = "error" | "warning";

export interface EcmValidationIssue {
  code: string;
  severity: EcmValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EcmValidationResult {
  valid: boolean;
  issues: EcmValidationIssue[];
}

export interface EcmMissingEmailPrompt {
  contactId: string;
  warning: boolean;
  message: string;
}

export interface EcmAuditReference {
  id: string;
  entityId: string;
  entityType: "contact";
  eafAuditEntryId: string;
  recordedOn: string;
}

export interface EcmRegistrySnapshot {
  contacts: EcmContact[];
  auditReferences: EcmAuditReference[];
}
