/**
 * EIAE authorization foundation — roles, permissions, groups, templates.
 */

import type {
  EiaePermissionDefinition,
  EiaePermissionGroupDefinition,
  EiaePermissionTemplateDefinition,
  EiaeRoleDefinition,
} from "@/types/enterprise-identity-access-engine";
import { getEiaePorts } from "./composition";

export function listEiaePermissions(): EiaePermissionDefinition[] {
  return getEiaePorts().authorization.listPermissions();
}

export function registerEiaePermission(permission: EiaePermissionDefinition): void {
  getEiaePorts().authorization.savePermission(permission);
}

export function listEiaeRoles(): EiaeRoleDefinition[] {
  return getEiaePorts().authorization.listRoles();
}

export function getEiaeRole(roleCode: string): EiaeRoleDefinition | undefined {
  return listEiaeRoles().find((r) => r.roleCode === roleCode && r.enabled);
}

export function registerEiaeRole(role: EiaeRoleDefinition): void {
  getEiaePorts().authorization.saveRole(role);
}

export function listEiaePermissionGroups(): EiaePermissionGroupDefinition[] {
  return getEiaePorts().authorization.listPermissionGroups();
}

export function registerEiaePermissionGroup(group: EiaePermissionGroupDefinition): void {
  getEiaePorts().authorization.savePermissionGroup(group);
}

export function listEiaePermissionTemplates(): EiaePermissionTemplateDefinition[] {
  return getEiaePorts().authorization.listPermissionTemplates();
}

export function registerEiaePermissionTemplate(template: EiaePermissionTemplateDefinition): void {
  getEiaePorts().authorization.savePermissionTemplate(template);
}

export function resolveEiaePermissionsForPersona(personaCode: string): EiaePermissionDefinition[] {
  const templates = listEiaePermissionTemplates().filter(
    (t) => t.enabled && t.applicablePersonaCodes.includes(personaCode),
  );
  const roleCodes = new Set(templates.flatMap((t) => t.roleCodes));
  const roles = listEiaeRoles().filter((r) => r.enabled && roleCodes.has(r.roleCode));
  const permissionCodes = new Set(roles.flatMap((r) => r.permissionCodes));
  return listEiaePermissions().filter((p) => p.enabled && permissionCodes.has(p.permissionCode));
}
