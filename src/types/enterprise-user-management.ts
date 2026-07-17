/**
 * Catalyst One v1.0 — Enterprise Identity & Access Management (IAM)
 *
 * Identity (Directory Contact) ≠ User Account ≠ Roles ≠ Permissions ≠ Platform Access
 * User Accounts are provisioned only from Directory Contacts via Platform Access grant.
 */

export type EnterpriseUserStatus =
  | "active"
  | "suspended"
  | "on_leave"
  | "resigned"
  | "archived";

/** Authentication / login lifecycle — independent of operational employment status. */
export type EnterpriseLoginStatus =
  | "pending_invitation"
  | "active"
  | "suspended"
  | "archived";

/** Mirrors Directory Contact platform access once a User Account exists. */
export type EnterprisePlatformAccess = "catalyst_one" | "compass" | "both";

export type EnterprisePermissionLevel = "view" | "create_edit" | "admin";

export type EnterpriseUserTheme = "system" | "light" | "dark";

export interface EnterpriseUserRoleAssignment {
  roleId: string;
  roleLabel: string;
  assignedAt: string;
  assignedBy: string;
}

export interface EnterpriseModulePermission {
  moduleId: string;
  view: boolean;
  createEdit: boolean;
  admin: boolean;
}

/**
 * Direct user override for a module — replaces the role∪template row for that module
 * in the Effective Permission Set.
 */
export interface EnterprisePermissionOverride {
  moduleId: string;
  view: boolean;
  createEdit: boolean;
  admin: boolean;
}

export interface EnterpriseUserPreferences {
  defaultDashboard: string;
  defaultLandingPage: string;
  theme: EnterpriseUserTheme;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  /** Future-ready */
  language: string;
}

export interface EnterpriseUserProductivity {
  /** Presence (online/offline/away) — not Login Status */
  presenceStatus: "online" | "offline" | "away";
  /** @deprecated Use presenceStatus — kept for localStorage migration */
  loginStatus?: "online" | "offline" | "away";
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  openOpportunities: number;
  activeLoanFiles: number;
  pendingTasks: number;
  pendingApprovals: number;
}

export type EnterpriseUserAuditAction =
  | "user_created"
  | "platform_access_granted"
  | "platform_access_revoked"
  | "activated"
  | "password_reset"
  | "roles_changed"
  | "permissions_changed"
  | "permission_overrides_changed"
  | "templates_changed"
  | "branch_changed"
  | "manager_changed"
  | "suspended"
  | "on_leave"
  | "resigned"
  | "archived"
  | "license_allocated"
  | "license_removed"
  | "work_transferred"
  | "profile_updated"
  | "login_status_changed";

export interface EnterpriseUserAuditEvent {
  id: string;
  userId: string;
  action: EnterpriseUserAuditAction;
  summary: string;
  actorId: string;
  actorName: string;
  at: string;
  meta?: Record<string, string>;
}

export interface EnterpriseUserLicense {
  allocated: boolean;
  licenseType: string;
  allocatedAt: string | null;
  allocatedBy: string | null;
}

/**
 * User Account — authentication object linked to exactly one Directory Contact.
 * Not an identity; Contact remains SSOT.
 */
export interface EnterpriseManagedUser {
  id: string;
  /** Directory Contact SSOT — required; User Accounts are never orphaned from identity */
  contactId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobile: string;
  avatarInitials: string;
  avatarUrl: string | null;
  designation: string;
  /** Primary department (display); also in departments[] */
  department: string;
  /** Primary branch (display); also in branches[] */
  branch: string;
  departments: string[];
  branches: string[];
  teams: string[];
  businessUnits: string[];
  reportingManagerIds: string[];
  reportingManagerNames: string[];
  /** Unlimited operational / RPE roles (responsibility — not final security) */
  roles: EnterpriseUserRoleAssignment[];
  /** Permission templates applied before user overrides */
  permissionTemplateIds: string[];
  /** Direct overrides — win over role∪template for listed modules */
  permissionOverrides: EnterprisePermissionOverride[];
  /**
   * Cached Effective Permission Set (roles ∪ templates ∪ overrides).
   * Application enforcement must use computeEffectivePermissions().
   */
  permissions: EnterpriseModulePermission[];
  /** Platform access mirrored from Directory Contact — independent of permissions */
  platformAccess: EnterprisePlatformAccess;
  /** Login / auth lifecycle */
  loginStatus: EnterpriseLoginStatus;
  preferences: EnterpriseUserPreferences;
  productivity: EnterpriseUserProductivity;
  /** Operational employment status (exit / leave) — independent of loginStatus */
  status: EnterpriseUserStatus;
  dateJoined: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  license: EnterpriseUserLicense;
  /** Frozen certification admin — cannot remove license / archive without safeguard */
  isSystemProtected: boolean;
  audit: EnterpriseUserAuditEvent[];
}

/** Snapshot returned by Effective Access preview */
export interface EnterpriseEffectiveAccessPreview {
  contactId: string;
  platformAccess: EnterprisePlatformAccess | "no_access";
  loginStatus: EnterpriseLoginStatus;
  assignedRoles: EnterpriseUserRoleAssignment[];
  permissionTemplateIds: string[];
  roleDerived: EnterpriseModulePermission[];
  effectivePermissions: EnterpriseModulePermission[];
  overrideModuleIds: string[];
}

export interface EnterpriseUserListFilters {
  query: string;
  branch: string | "all";
  department: string | "all";
  roleId: string | "all";
  status: EnterpriseUserStatus | "all";
  managerId: string | "all";
}

export type EnterpriseUserSortField =
  | "employeeId"
  | "fullName"
  | "designation"
  | "department"
  | "branch"
  | "status"
  | "lastLoginAt"
  | "createdAt";

export interface EnterpriseWorkTransferResult {
  userId: string;
  transferredToManagerId: string;
  transferredToManagerName: string;
  opportunities: number;
  loanFiles: number;
  tasks: number;
  approvals: number;
}
