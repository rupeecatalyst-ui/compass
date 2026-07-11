/**
 * EIAE authorization foundation constants.
 */

import { EIAE_PERSONA_CODES } from "./personas";
import type {
  EiaePermissionDefinition,
  EiaePermissionGroupDefinition,
  EiaePermissionTemplateDefinition,
  EiaeRoleDefinition,
} from "@/types/enterprise-identity-access-engine";

export const EIAE_PERMISSION_CODES = {
  VIEW_IDENTITY: "view_identity",
  MANAGE_IDENTITY: "manage_identity",
  ASSIGN_ROLE: "assign_role",
  VIEW_PERMISSIONS: "view_permissions",
  MANAGE_PERMISSIONS: "manage_permissions",
} as const;

export const EIAE_ROLE_CODES = {
  PLATFORM_ADMIN: "platform_admin",
  IDENTITY_MANAGER: "identity_manager",
  READ_ONLY_AUDITOR: "read_only_auditor",
} as const;

export const EIAE_DEFAULT_PERMISSIONS: EiaePermissionDefinition[] = [
  { id: "eiae-perm-view-identity", permissionCode: EIAE_PERMISSION_CODES.VIEW_IDENTITY, label: "View Identity", description: "View identity records.", category: "identity", enabled: true },
  { id: "eiae-perm-manage-identity", permissionCode: EIAE_PERMISSION_CODES.MANAGE_IDENTITY, label: "Manage Identity", description: "Create and update identity records.", category: "identity", enabled: true },
  { id: "eiae-perm-assign-role", permissionCode: EIAE_PERMISSION_CODES.ASSIGN_ROLE, label: "Assign Role", description: "Assign roles to identities.", category: "authorization", enabled: true },
  { id: "eiae-perm-view-permissions", permissionCode: EIAE_PERMISSION_CODES.VIEW_PERMISSIONS, label: "View Permissions", description: "View permission definitions.", category: "authorization", enabled: true },
  { id: "eiae-perm-manage-permissions", permissionCode: EIAE_PERMISSION_CODES.MANAGE_PERMISSIONS, label: "Manage Permissions", description: "Manage permission definitions.", category: "authorization", enabled: true },
];

export const EIAE_DEFAULT_ROLES: EiaeRoleDefinition[] = [
  { id: "eiae-role-platform-admin", roleCode: EIAE_ROLE_CODES.PLATFORM_ADMIN, label: "Platform Admin", description: "Full platform identity administration.", permissionCodes: Object.values(EIAE_PERMISSION_CODES), personaCodes: [EIAE_PERSONA_CODES.SUPER_ADMIN], enabled: true },
  { id: "eiae-role-identity-manager", roleCode: EIAE_ROLE_CODES.IDENTITY_MANAGER, label: "Identity Manager", description: "Manage identity records.", permissionCodes: [EIAE_PERMISSION_CODES.VIEW_IDENTITY, EIAE_PERMISSION_CODES.MANAGE_IDENTITY, EIAE_PERMISSION_CODES.ASSIGN_ROLE], personaCodes: [EIAE_PERSONA_CODES.MANAGEMENT], enabled: true },
  { id: "eiae-role-read-only-auditor", roleCode: EIAE_ROLE_CODES.READ_ONLY_AUDITOR, label: "Read Only Auditor", description: "View-only access to identity and permissions.", permissionCodes: [EIAE_PERMISSION_CODES.VIEW_IDENTITY, EIAE_PERMISSION_CODES.VIEW_PERMISSIONS], personaCodes: [EIAE_PERSONA_CODES.MANAGEMENT], enabled: true },
];

export const EIAE_DEFAULT_PERMISSION_GROUPS: EiaePermissionGroupDefinition[] = [
  { id: "eiae-group-identity-admin", groupCode: "identity_administration", label: "Identity Administration", description: "Identity management permissions.", permissionCodes: [EIAE_PERMISSION_CODES.VIEW_IDENTITY, EIAE_PERMISSION_CODES.MANAGE_IDENTITY], enabled: true },
  { id: "eiae-group-authz-admin", groupCode: "authorization_administration", label: "Authorization Administration", description: "Role and permission management.", permissionCodes: [EIAE_PERMISSION_CODES.VIEW_PERMISSIONS, EIAE_PERMISSION_CODES.MANAGE_PERMISSIONS, EIAE_PERMISSION_CODES.ASSIGN_ROLE], enabled: true },
];

export const EIAE_DEFAULT_PERMISSION_TEMPLATES: EiaePermissionTemplateDefinition[] = [
  { id: "eiae-tpl-super-admin", templateCode: "super_admin_template", label: "Super Admin Template", description: "Default permissions for super admin.", roleCodes: [EIAE_ROLE_CODES.PLATFORM_ADMIN], permissionGroupCodes: ["identity_administration", "authorization_administration"], applicablePersonaCodes: [EIAE_PERSONA_CODES.SUPER_ADMIN], enabled: true },
  { id: "eiae-tpl-employee", templateCode: "employee_template", label: "Employee Template", description: "Default permissions for employees.", roleCodes: [EIAE_ROLE_CODES.READ_ONLY_AUDITOR], permissionGroupCodes: [], applicablePersonaCodes: [EIAE_PERSONA_CODES.EMPLOYEE], enabled: true },
];
