/**
 * Catalyst One v1.0 — Roles & Permissions Engine
 * Security backbone: identity ≠ roles ≠ permissions ≠ platform access.
 */

import type { EnterpriseModulePermission } from "@/types/enterprise-user-management";

export type RpeUserType = "normal_employee" | "hybrid_employee";

export type RpePlatformAccess = "catalyst_one" | "compass" | "both";

export type RpeRoleStatus = "active" | "inactive";

export type RpePermissionMatrixRow = EnterpriseModulePermission;

export interface RpeRoleDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  status: RpeRoleStatus;
  /** Default permission matrix for this role (users may override). */
  permissions: RpePermissionMatrixRow[];
  /** Default platform access suggested by this role — independent of permissions. */
  platformAccess: RpePlatformAccess;
  /** Suggested user type — does not control permissions. */
  defaultUserType: RpeUserType;
  isSystem: boolean;
  /** Super Admin role — cannot remove last active holder protections. */
  isSuperAdminRole: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** Future: ABAC / time-based / temporary / SSO / multi-org / API */
  extensions: {
    abacRules?: unknown[];
    timeWindow?: { start: string; end: string } | null;
    temporaryUntil?: string | null;
    requiresApproval?: boolean;
    ssoGroupMaps?: string[];
    organizationScopes?: string[];
    apiScopes?: string[];
  };
}

export interface RpePermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: RpePermissionMatrixRow[];
  platformAccess: RpePlatformAccess;
  defaultUserType: RpeUserType;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** Level-1 Role Administration delegation (non-recursive). */
export interface RpeRoleAdminDelegation {
  id: string;
  /** Delegatee must be Level-1 direct report of Super Admin. */
  delegateUserId: string;
  delegateUserName: string;
  delegatedByUserId: string;
  delegatedByUserName: string;
  grantedAt: string;
  revokedAt: string | null;
  active: boolean;
}

export type RpeAuditAction =
  | "role_created"
  | "role_updated"
  | "role_cloned"
  | "role_activated"
  | "role_deactivated"
  | "role_deleted"
  | "template_created"
  | "template_updated"
  | "template_deleted"
  | "delegation_granted"
  | "delegation_revoked"
  | "permission_matrix_changed"
  | "sensitive_permission_confirmed";

export interface RpeAuditEvent {
  id: string;
  action: RpeAuditAction;
  entityType: "role" | "template" | "delegation" | "system";
  entityId: string;
  entityLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changedByUserId: string;
  changedByUserName: string;
  at: string;
  reason: string | null;
  /** Future-ready */
  ipAddress: string | null;
  deviceInfo: string | null;
}

export interface RpeEngineSnapshot {
  schemaVersion: 1;
  roles: RpeRoleDefinition[];
  templates: RpePermissionTemplate[];
  delegations: RpeRoleAdminDelegation[];
  audit: RpeAuditEvent[];
}
