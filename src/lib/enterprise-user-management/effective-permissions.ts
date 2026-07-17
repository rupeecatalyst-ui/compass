/**
 * Effective Permission Engine
 *
 * Assigned Roles → Role Permissions → Permission Templates → User Overrides
 * → Effective Permission Set (sole model enforced by the application)
 * → gated by Platform Access / Login Status
 */

import { defaultPermissionMatrix } from "@/constants/enterprise-user-management";
import { getRpeRole, listRpeTemplates } from "@/lib/roles-permissions-engine";
import type {
  EnterpriseEffectiveAccessPreview,
  EnterpriseManagedUser,
  EnterpriseModulePermission,
  EnterprisePermissionOverride,
} from "@/types/enterprise-user-management";

function emptyMatrix(): EnterpriseModulePermission[] {
  return defaultPermissionMatrix();
}

function orRow(
  a: EnterpriseModulePermission | undefined,
  b: EnterpriseModulePermission | undefined,
  moduleId: string,
): EnterpriseModulePermission {
  return {
    moduleId,
    view: Boolean(a?.view || b?.view),
    createEdit: Boolean(a?.createEdit || b?.createEdit),
    admin: Boolean(a?.admin || b?.admin),
  };
}

/** Union (OR) of permission matrices across modules. */
export function unionPermissionMatrices(
  matrices: EnterpriseModulePermission[][],
): EnterpriseModulePermission[] {
  const base = emptyMatrix();
  return base.map((row) => {
    let acc = row;
    for (const matrix of matrices) {
      const other = matrix.find((m) => m.moduleId === row.moduleId);
      acc = orRow(acc, other, row.moduleId);
    }
    return acc;
  });
}

export function derivePermissionsFromRoles(
  roleIds: string[],
): EnterpriseModulePermission[] {
  const matrices = roleIds
    .map((id) => getRpeRole(id)?.permissions)
    .filter((m): m is EnterpriseModulePermission[] => Boolean(m));
  if (!matrices.length) return emptyMatrix();
  return unionPermissionMatrices(matrices);
}

export function derivePermissionsFromTemplates(
  templateIds: string[],
): EnterpriseModulePermission[] {
  const all = listRpeTemplates();
  const matrices = templateIds
    .map((id) => all.find((t) => t.id === id)?.permissions)
    .filter((m): m is EnterpriseModulePermission[] => Boolean(m));
  if (!matrices.length) return emptyMatrix();
  return unionPermissionMatrices(matrices);
}

/**
 * Role ∪ Template baseline before user overrides.
 */
export function computeRoleTemplateBaseline(
  roleIds: string[],
  templateIds: string[],
): EnterpriseModulePermission[] {
  return unionPermissionMatrices([
    derivePermissionsFromRoles(roleIds),
    derivePermissionsFromTemplates(templateIds),
  ]);
}

/**
 * Apply module-level overrides (override row replaces baseline for that module).
 */
export function applyPermissionOverrides(
  baseline: EnterpriseModulePermission[],
  overrides: EnterprisePermissionOverride[],
): EnterpriseModulePermission[] {
  if (!overrides.length) return baseline.map((r) => ({ ...r }));
  const byId = new Map(overrides.map((o) => [o.moduleId, o]));
  return baseline.map((row) => {
    const o = byId.get(row.moduleId);
    if (!o) return { ...row };
    return {
      moduleId: row.moduleId,
      view: o.view,
      createEdit: o.createEdit,
      admin: o.admin,
    };
  });
}

/**
 * Sole permission model enforced by the application.
 */
export function computeEffectivePermissions(user: Pick<
  EnterpriseManagedUser,
  "roles" | "permissionTemplateIds" | "permissionOverrides"
>): EnterpriseModulePermission[] {
  const baseline = computeRoleTemplateBaseline(
    user.roles.map((r) => r.roleId),
    user.permissionTemplateIds ?? [],
  );
  return applyPermissionOverrides(baseline, user.permissionOverrides ?? []);
}

/**
 * Diff current matrix vs baseline → store only overridden modules.
 */
export function diffAsOverrides(
  baseline: EnterpriseModulePermission[],
  desired: EnterpriseModulePermission[],
): EnterprisePermissionOverride[] {
  const overrides: EnterprisePermissionOverride[] = [];
  for (const row of desired) {
    const base = baseline.find((b) => b.moduleId === row.moduleId) ?? {
      moduleId: row.moduleId,
      view: false,
      createEdit: false,
      admin: false,
    };
    if (
      base.view !== row.view ||
      base.createEdit !== row.createEdit ||
      base.admin !== row.admin
    ) {
      overrides.push({
        moduleId: row.moduleId,
        view: row.view,
        createEdit: row.createEdit,
        admin: row.admin,
      });
    }
  }
  return overrides;
}

export function buildEffectiveAccessPreview(
  user: EnterpriseManagedUser,
): EnterpriseEffectiveAccessPreview {
  const roleIds = user.roles.map((r) => r.roleId);
  const templateIds = user.permissionTemplateIds ?? [];
  const roleDerived = computeRoleTemplateBaseline(roleIds, templateIds);
  const effectivePermissions = applyPermissionOverrides(
    roleDerived,
    user.permissionOverrides ?? [],
  );
  return {
    contactId: user.contactId,
    platformAccess: user.platformAccess,
    loginStatus: user.loginStatus,
    assignedRoles: user.roles,
    permissionTemplateIds: templateIds,
    roleDerived,
    effectivePermissions,
    overrideModuleIds: (user.permissionOverrides ?? []).map((o) => o.moduleId),
  };
}

export type PermissionLevelKey = "view" | "createEdit" | "admin";

export interface PermissionWhyExplanation {
  moduleId: string;
  level: PermissionLevelKey;
  granted: boolean;
  sources: Array<"role" | "access_profile" | "user_override" | "none">;
  roleNames: string[];
  accessProfileNames: string[];
  modifiedByOverride: boolean;
  lastChangedBy: string | null;
  lastChangedAt: string | null;
  summaryLines: string[];
}

/**
 * Explain why a specific module permission level is (or is not) granted.
 */
export function explainPermission(
  user: EnterpriseManagedUser,
  moduleId: string,
  level: PermissionLevelKey,
): PermissionWhyExplanation {
  const roleIds = user.roles.map((r) => r.roleId);
  const templateIds = user.permissionTemplateIds ?? [];
  const templates = listRpeTemplates();

  const roleNames: string[] = [];
  for (const roleId of roleIds) {
    const role = getRpeRole(roleId);
    if (!role) continue;
    const row = role.permissions.find((p) => p.moduleId === moduleId);
    if (row?.[level]) roleNames.push(role.name);
  }

  const accessProfileNames: string[] = [];
  for (const tid of templateIds) {
    const tpl = templates.find((t) => t.id === tid);
    if (!tpl) continue;
    const row = tpl.permissions.find((p) => p.moduleId === moduleId);
    if (row?.[level]) accessProfileNames.push(tpl.name);
  }

  const override = (user.permissionOverrides ?? []).find((o) => o.moduleId === moduleId);
  const modifiedByOverride = Boolean(override);
  const granted = Boolean(
    computeEffectivePermissions(user).find((p) => p.moduleId === moduleId)?.[level],
  );

  const sources: PermissionWhyExplanation["sources"] = [];
  if (modifiedByOverride) sources.push("user_override");
  if (roleNames.length) sources.push("role");
  if (accessProfileNames.length) sources.push("access_profile");
  if (!sources.length) sources.push("none");

  const auditHit = user.audit.find(
    (e) =>
      e.action === "permission_overrides_changed" ||
      e.action === "permissions_changed" ||
      e.action === "roles_changed" ||
      e.action === "templates_changed",
  );

  const summaryLines: string[] = [];
  if (modifiedByOverride) {
    summaryLines.push(
      `Modified by User Override (${level === "createEdit" ? "Create/Edit" : level === "admin" ? "Admin" : "View"} = ${override?.[level] ? "Granted" : "Denied"})`,
    );
  }
  if (roleNames.length) {
    summaryLines.push(`Granted by Role: ${roleNames.join(", ")}`);
  }
  if (accessProfileNames.length) {
    summaryLines.push(`Granted by Access Profile: ${accessProfileNames.join(", ")}`);
  }
  if (!roleNames.length && !accessProfileNames.length && !modifiedByOverride) {
    summaryLines.push("Not granted by any Role, Access Profile, or Override");
  }
  summaryLines.push(
    `Last Changed By: ${auditHit?.actorName ?? "System"}`,
  );
  summaryLines.push(
    `Date & Time: ${auditHit?.at ? new Date(auditHit.at).toLocaleString("en-IN") : "—"}`,
  );

  return {
    moduleId,
    level,
    granted,
    sources,
    roleNames,
    accessProfileNames,
    modifiedByOverride,
    lastChangedBy: auditHit?.actorName ?? null,
    lastChangedAt: auditHit?.at ?? null,
    summaryLines,
  };
}
