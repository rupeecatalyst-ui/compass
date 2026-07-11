/**
 * Enterprise Identity & Access Engine (EIAE) — Sprint 3 Foundation.
 *
 * Separates Identity, Authentication, and Authorization as independent concerns.
 * Configuration-driven. No runtime auth implementation.
 */

// ---------------------------------------------------------------------------
// Identity model
// ---------------------------------------------------------------------------

export type EiaeIdentityType =
  | "internal_user"
  | "external_user"
  | "employee"
  | "customer"
  | "wealth_partner"
  | "builder_partner"
  | "lender_employee";

export type EiaeIdentityStatus =
  | "draft"
  | "active"
  | "inactive"
  | "suspended"
  | "archived";

/** Globally unique, immutable enterprise identity identifier — assigned once at creation. */
export type EiaeEnterpriseIdentityId = string;

/** Lifecycle pointers complementing the Enterprise Audit Engine — not a replacement. */
export interface EiaeIdentityLifecycleMetadata {
  createdBy: string;
  createdOn: string;
  lastModifiedBy: string;
  lastModifiedOn: string;
  activatedBy?: string;
  activatedOn?: string;
  deactivatedBy?: string;
  deactivatedOn?: string;
}

export interface EiaeIdentityRecord {
  /** Internal persistence key. */
  id: string;
  /** Enterprise Identity ID — generated once, immutable, never reused. */
  enterpriseIdentityId: EiaeEnterpriseIdentityId;
  identityType: EiaeIdentityType;
  status: EiaeIdentityStatus;
  personaCode: string;
  businessUnitRef?: string;
  branchRef?: string;
  /** Reference to EME metadata schema — resolved in future sprints. */
  metadataSchemaRef?: string;
  displayName: string;
  email?: string;
  mobile?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
  activatedBy?: string;
  activatedOn?: string;
  deactivatedBy?: string;
  deactivatedOn?: string;
  /** Physical deletion is prohibited — use lifecycle status instead. */
  archivedFlag: boolean;
  remarks?: string;
}

export type EiaeIdentityLifecycleAction =
  | "create"
  | "activate"
  | "deactivate"
  | "suspend"
  | "archive";

// ---------------------------------------------------------------------------
// Persona registry
// ---------------------------------------------------------------------------

export interface EiaePersonaDefinition {
  id: string;
  personaCode: string;
  label: string;
  description: string;
  applicableIdentityTypes: EiaeIdentityType[];
  enabled: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Authentication policy framework — metadata only
// ---------------------------------------------------------------------------

export type EiaeAuthProviderCode = string;

export interface EiaeAuthenticationProviderDefinition {
  id: string;
  providerCode: EiaeAuthProviderCode;
  label: string;
  description: string;
  /** Extensible provider type — never hardcoded at runtime. */
  providerType: string;
  enabled: boolean;
  sortOrder: number;
}

export type EiaeAuthPolicyLevel =
  | "global"
  | "business_unit"
  | "persona"
  | "individual";

export interface EiaeAuthenticationPolicyDefinition {
  id: string;
  policyLevel: EiaeAuthPolicyLevel;
  /** Scope reference: "*" for global, business unit id, persona code, or identity id. */
  scopeRef: string;
  label: string;
  description: string;
  providerCodes: EiaeAuthProviderCode[];
  /** Lower number = higher precedence within same level; levels ordered: global → bu → persona → individual. */
  precedence: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Authorization foundation
// ---------------------------------------------------------------------------

export interface EiaePermissionDefinition {
  id: string;
  permissionCode: string;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
}

export interface EiaeRoleDefinition {
  id: string;
  roleCode: string;
  label: string;
  description: string;
  permissionCodes: string[];
  personaCodes: string[];
  enabled: boolean;
}

export interface EiaePermissionGroupDefinition {
  id: string;
  groupCode: string;
  label: string;
  description: string;
  permissionCodes: string[];
  enabled: boolean;
}

export interface EiaePermissionTemplateDefinition {
  id: string;
  templateCode: string;
  label: string;
  description: string;
  roleCodes: string[];
  permissionGroupCodes: string[];
  applicablePersonaCodes: string[];
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Organizational access foundation (OSV)
// ---------------------------------------------------------------------------

export type EiaeOrgScopeLevel =
  | "company"
  | "business_unit"
  | "region"
  | "state"
  | "city"
  | "branch"
  | "team"
  | "individual";

export interface EiaeOrganizationalScopeDefinition {
  id: string;
  scopeLevel: EiaeOrgScopeLevel;
  scopeCode: string;
  label: string;
  description: string;
  parentScopeRef?: string;
  enabled: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Session foundation — metadata only
// ---------------------------------------------------------------------------

export interface EiaeSessionMetadata {
  id: string;
  identityId: string;
  sessionTokenRef: string;
  deviceId?: string;
  startedOn: string;
  expiresOn?: string;
  activeFlag: boolean;
  mfaRequired: boolean;
  mfaCompleted: boolean;
}

export interface EiaeDeviceMetadata {
  id: string;
  identityId: string;
  deviceCode: string;
  deviceType: string;
  label: string;
  lastSeenOn?: string;
  trustedFlag: boolean;
  enabled: boolean;
}

export interface EiaeLoginHistoryRecord {
  id: string;
  identityId: string;
  attemptedOn: string;
  providerCode?: string;
  successFlag: boolean;
  ipAddressRef?: string;
  deviceId?: string;
  remarks?: string;
}

export interface EiaeMfaMetadataPlaceholder {
  id: string;
  mfaMethodCode: string;
  label: string;
  description: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Deletion & recovery governance foundation
// ---------------------------------------------------------------------------

export type EiaeDeletionGovernancePermissionCode =
  | "move_to_recycle_bin"
  | "restore_from_recycle_bin"
  | "permanent_purge";

export interface EiaeDeletionGovernancePermission {
  id: string;
  permissionCode: EiaeDeletionGovernancePermissionCode;
  label: string;
  description: string;
  /** Persona codes authorized — permanent_purge restricted to super_admin. */
  authorizedPersonaCodes: string[];
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EiaeRegistrySnapshot {
  identities: EiaeIdentityRecord[];
  personas: EiaePersonaDefinition[];
  authProviders: EiaeAuthenticationProviderDefinition[];
  authPolicies: EiaeAuthenticationPolicyDefinition[];
  permissions: EiaePermissionDefinition[];
  roles: EiaeRoleDefinition[];
  permissionGroups: EiaePermissionGroupDefinition[];
  permissionTemplates: EiaePermissionTemplateDefinition[];
  orgScopes: EiaeOrganizationalScopeDefinition[];
  deletionGovernance: EiaeDeletionGovernancePermission[];
}
