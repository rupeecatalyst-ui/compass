/**
 * ECM — Enterprise Contact Master.
 * Contact is the Single Source of Truth (SSOT) for every person in Catalyst One.
 * Business relationships are represented through configurable Roles from Role Master.
 */

export type EcmContactRole =
  | "customer"
  | "employee"
  | "lender_employee"
  | "partner"
  | "investor"
  | "builder"
  | "chartered_accountant";

export type EcmContactStatus = "provisional" | "active" | "complete" | "verified" | "archived";

/**
 * Platform access is independent of Contact identity and business roles.
 * Default: no_access. Granting access creates a linked User Account (never the reverse).
 */
export type EcmPlatformAccess = "no_access" | "catalyst_one" | "compass" | "both";

/**
 * Contact lifecycle (Enterprise UX Constitution — Progressive Contact Creation).
 * - provisional: minimum info; business may continue
 * - complete / active: required business information captured (active kept for legacy)
 * - verified: KYC / verification completed
 * - archived: not usable
 */
export type EcmContactLifecycleLabel = "provisional" | "complete" | "verified" | "archived";

export interface EcmContact {
  id: string;
  name: string;
  mobilePrimary: string;
  /** @deprecated Prefer `roles` — kept in sync as roles[0] for backward compatibility */
  primaryRole: EcmContactRole;
  mobileSecondary?: string;
  personalEmail?: string;
  officialEmail?: string;
  /** Identity master-data + KYC fields (SSOT — never re-asked on role tabs) */
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  pan?: string;
  aadhaar?: string;
  dateOfBirth?: string;
  /** Identity employment classification (captured at quick create) */
  employmentType?: string;
  /** @deprecated Prefer `roles` — kept in sync as roles.slice(1) */
  additionalRoles: EcmContactRole[];
  /** Unlimited assigned roles from Role Master (SSOT for role assignment) */
  roles: EcmContactRole[];
  enabled: boolean;
  status: EcmContactStatus;
  /**
   * Platform Access (independent of identity). Default no_access.
   * Changing from no_access provisions a linked User Account.
   */
  platformAccess: EcmPlatformAccess;
  /** Linked authentication object — at most one User Account per Contact */
  linkedUserId: string | null;
  /** Relationship Manager / Owner display name */
  ownerName?: string;
  ownerId?: string;
  /** Configuration-driven calculated score (0–100) */
  contactScore: number;
  /** Latest business interaction timestamp (enterprise activity) */
  lastActiveOn: string;
  /** Role-specific profile fields — never duplicates Identity */
  roleProfiles?: Partial<Record<EcmContactRole, Record<string, string>>>;
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
  entityType: "contact" | "contact_relationship";
  eafAuditEntryId: string;
  recordedOn: string;
}

/**
 * Generic directed Contact↔Contact relationship.
 * Banker Reporting Manager uses relationshipType `reports_to`.
 * Additional types reuse this model without Contact schema redesign.
 *
 * Future readiness (no redesign of Contact required):
 * - Escalation Matrix → walk `reports_to` chain / meta.escalationPriority
 * - Organization Charts → graph of from→to by type
 * - Relationship Intelligence → aggregate by type + contextRole
 * - Branch Analytics → join banker org placement + relationship edges
 */
export type EcmContactRelationshipType =
  | "reports_to"
  | "managed_by"
  | "assistant_to"
  | "legal_representative"
  | "refers_to";

export type EcmContactRelationshipStatus = "active" | "inactive";

export interface EcmContactRelationship {
  id: string;
  /** Subject contact (e.g. banker who reports) */
  fromContactId: string;
  /** Related contact (e.g. reporting manager) */
  toContactId: string;
  relationshipType: EcmContactRelationshipType;
  /** Optional role context that owns this link in the UI */
  contextRole?: EcmContactRole;
  /**
   * Extensible metadata for future Escalation Matrix, Coverage, Analytics —
   * without redesigning the Contact entity.
   */
  meta?: Record<string, string>;
  status: EcmContactRelationshipStatus;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

export interface EcmRegistrySnapshot {
  contacts: EcmContact[];
  relationships: EcmContactRelationship[];
  auditReferences: EcmAuditReference[];
}

export interface EcmContactQuery {
  search?: string;
  roles?: EcmContactRole[];
  status?: EcmContactStatus | "all";
  page?: number;
  pageSize?: number;
  sortBy?: "createdOn" | "modifiedOn" | "lastActiveOn" | "name" | "contactScore";
  sortDir?: "asc" | "desc";
}

export interface EcmContactQueryResult {
  items: EcmContact[];
  total: number;
  page: number;
  pageSize: number;
}
