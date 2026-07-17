import {
  RPE_SEED_ROLES,
  RPE_SEED_TEMPLATES,
  RPE_STORAGE_KEY,
  clonePermissionMatrix,
  matrixTouchesSensitiveAdmin,
} from "@/constants/roles-permissions-engine";
import { listEnterpriseUsers } from "@/lib/enterprise-user-management";
import { FROZEN_CERTIFICATION_ADMIN_EMAIL } from "@/constants/enterprise-user-management";
import type {
  RpeAuditAction,
  RpeAuditEvent,
  RpeEngineSnapshot,
  RpePermissionMatrixRow,
  RpePermissionTemplate,
  RpePlatformAccess,
  RpeRoleAdminDelegation,
  RpeRoleDefinition,
  RpeRoleStatus,
  RpeUserType,
} from "@/types/roles-permissions-engine";

function empty(): RpeEngineSnapshot {
  return {
    schemaVersion: 1,
    roles: structuredClone(RPE_SEED_ROLES),
    templates: structuredClone(RPE_SEED_TEMPLATES),
    delegations: [],
    audit: [],
  };
}

function read(): RpeEngineSnapshot {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(RPE_STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as RpeEngineSnapshot;
    if (!parsed?.roles?.length) return empty();
    return {
      schemaVersion: 1,
      roles: parsed.roles,
      templates: parsed.templates ?? [],
      delegations: parsed.delegations ?? [],
      audit: parsed.audit ?? [],
    };
  } catch {
    return empty();
  }
}

function write(snap: RpeEngineSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RPE_STORAGE_KEY, JSON.stringify(snap));
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pushAudit(
  snap: RpeEngineSnapshot,
  partial: Omit<RpeAuditEvent, "id" | "at" | "ipAddress" | "deviceInfo">,
) {
  snap.audit.unshift({
    ...partial,
    id: newId("rpe_aud"),
    at: new Date().toISOString(),
    ipAddress: null,
    deviceInfo: null,
  });
}

export function listRpeRoles(): RpeRoleDefinition[] {
  return [...read().roles].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRpeRole(id: string): RpeRoleDefinition | undefined {
  return read().roles.find((r) => r.id === id);
}

export function listRpeTemplates(): RpePermissionTemplate[] {
  return [...read().templates].sort((a, b) => a.name.localeCompare(b.name));
}

export function listRpeDelegations(): RpeRoleAdminDelegation[] {
  return read().delegations;
}

export function listRpeAudit(): RpeAuditEvent[] {
  return read().audit;
}

export function countActiveSuperAdminRoleHolders(): number {
  const users = listEnterpriseUsers();
  return users.filter(
    (u) =>
      u.status === "active" &&
      (u.roles.some((r) => r.roleId === "super_admin" || r.roleId === "role_super_admin") ||
        u.email === FROZEN_CERTIFICATION_ADMIN_EMAIL ||
        u.isSystemProtected),
  ).length;
}

export function canAdministerRoles(actorUserId: string, isSessionSuperAdmin: boolean): boolean {
  if (isSessionSuperAdmin) return true;
  const snap = read();
  return snap.delegations.some(
    (d) => d.active && !d.revokedAt && d.delegateUserId === actorUserId,
  );
}

export function createRpeRole(input: {
  name: string;
  code: string;
  description: string;
  permissions: RpePermissionMatrixRow[];
  platformAccess: RpePlatformAccess;
  defaultUserType: RpeUserType;
  actor: { id: string; name: string };
  reason?: string;
  sensitiveConfirmed?: boolean;
}): RpeRoleDefinition {
  assertSensitiveOk(input.permissions, input.sensitiveConfirmed);
  const snap = read();
  const now = new Date().toISOString();
  const role: RpeRoleDefinition = {
    id: newId("role"),
    code: input.code.trim().toUpperCase().replace(/\s+/g, "_"),
    name: input.name.trim(),
    description: input.description.trim(),
    status: "active",
    permissions: clonePermissionMatrix(input.permissions),
    platformAccess: input.platformAccess,
    defaultUserType: input.defaultUserType,
    isSystem: false,
    isSuperAdminRole: false,
    createdAt: now,
    updatedAt: now,
    createdBy: input.actor.id,
    extensions: {},
  };
  snap.roles.unshift(role);
  pushAudit(snap, {
    action: "role_created",
    entityType: "role",
    entityId: role.id,
    entityLabel: role.name,
    previousValue: null,
    newValue: JSON.stringify({ code: role.code, name: role.name }),
    changedByUserId: input.actor.id,
    changedByUserName: input.actor.name,
    reason: input.reason ?? null,
  });
  write(snap);
  return role;
}

export function updateRpeRole(
  id: string,
  patch: Partial<
    Pick<
      RpeRoleDefinition,
      | "name"
      | "description"
      | "permissions"
      | "platformAccess"
      | "defaultUserType"
      | "status"
    >
  >,
  actor: { id: string; name: string },
  opts?: { reason?: string; sensitiveConfirmed?: boolean },
): RpeRoleDefinition {
  const snap = read();
  const idx = snap.roles.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Role not found");
  const current = snap.roles[idx]!;

  if (patch.permissions) {
    assertSensitiveOk(patch.permissions, opts?.sensitiveConfirmed);
  }

  if (current.isSuperAdminRole && patch.status === "inactive") {
    // Deactivating the Super Admin *role definition* is blocked if it would strand governance.
    if (countActiveSuperAdminRoleHolders() <= 1) {
      throw new Error(
        "Cannot deactivate the Super Admin role while only one active Super Administrator exists.",
      );
    }
  }

  const previous = JSON.stringify({
    name: current.name,
    status: current.status,
    platformAccess: current.platformAccess,
  });

  const updated: RpeRoleDefinition = {
    ...current,
    ...patch,
    permissions: patch.permissions
      ? clonePermissionMatrix(patch.permissions)
      : current.permissions,
    id: current.id,
    code: current.code,
    isSystem: current.isSystem,
    isSuperAdminRole: current.isSuperAdminRole,
    updatedAt: new Date().toISOString(),
  };

  snap.roles[idx] = updated;
  const action: RpeAuditAction =
    patch.status === "active"
      ? "role_activated"
      : patch.status === "inactive"
        ? "role_deactivated"
        : patch.permissions
          ? "permission_matrix_changed"
          : "role_updated";

  pushAudit(snap, {
    action,
    entityType: "role",
    entityId: updated.id,
    entityLabel: updated.name,
    previousValue: previous,
    newValue: JSON.stringify({
      name: updated.name,
      status: updated.status,
      platformAccess: updated.platformAccess,
    }),
    changedByUserId: actor.id,
    changedByUserName: actor.name,
    reason: opts?.reason ?? null,
  });

  if (opts?.sensitiveConfirmed && patch.permissions) {
    pushAudit(snap, {
      action: "sensitive_permission_confirmed",
      entityType: "role",
      entityId: updated.id,
      entityLabel: updated.name,
      previousValue: null,
      newValue: matrixTouchesSensitiveAdmin(patch.permissions).join(", "),
      changedByUserId: actor.id,
      changedByUserName: actor.name,
      reason: opts.reason ?? "Sensitive Admin access confirmed",
    });
  }

  write(snap);
  return updated;
}

export function cloneRpeRole(
  id: string,
  actor: { id: string; name: string },
): RpeRoleDefinition {
  const source = getRpeRole(id);
  if (!source) throw new Error("Role not found");
  return createRpeRole({
    name: `${source.name} (Copy)`,
    code: `${source.code}_COPY`,
    description: source.description,
    permissions: clonePermissionMatrix(source.permissions),
    platformAccess: source.platformAccess,
    defaultUserType: source.defaultUserType,
    actor,
    reason: `Cloned from ${source.name}`,
    sensitiveConfirmed: true,
  });
}

export function deleteRpeRole(id: string, actor: { id: string; name: string }): void {
  const snap = read();
  const role = snap.roles.find((r) => r.id === id);
  if (!role) throw new Error("Role not found");
  if (role.isSystem || role.isSuperAdminRole) {
    throw new Error("System / Super Admin roles cannot be deleted.");
  }
  snap.roles = snap.roles.filter((r) => r.id !== id);
  pushAudit(snap, {
    action: "role_deleted",
    entityType: "role",
    entityId: role.id,
    entityLabel: role.name,
    previousValue: role.name,
    newValue: null,
    changedByUserId: actor.id,
    changedByUserName: actor.name,
    reason: null,
  });
  write(snap);
}

export function setRpeRoleStatus(
  id: string,
  status: RpeRoleStatus,
  actor: { id: string; name: string },
): RpeRoleDefinition {
  return updateRpeRole(id, { status }, actor);
}

export function createRpeTemplate(input: {
  name: string;
  description: string;
  permissions: RpePermissionMatrixRow[];
  platformAccess: RpePlatformAccess;
  defaultUserType: RpeUserType;
  actor: { id: string; name: string };
  sensitiveConfirmed?: boolean;
}): RpePermissionTemplate {
  assertSensitiveOk(input.permissions, input.sensitiveConfirmed);
  const snap = read();
  const now = new Date().toISOString();
  const tpl: RpePermissionTemplate = {
    id: newId("tpl"),
    name: input.name.trim(),
    description: input.description.trim(),
    permissions: clonePermissionMatrix(input.permissions),
    platformAccess: input.platformAccess,
    defaultUserType: input.defaultUserType,
    createdAt: now,
    updatedAt: now,
    createdBy: input.actor.id,
  };
  snap.templates.unshift(tpl);
  pushAudit(snap, {
    action: "template_created",
    entityType: "template",
    entityId: tpl.id,
    entityLabel: tpl.name,
    previousValue: null,
    newValue: tpl.name,
    changedByUserId: input.actor.id,
    changedByUserName: input.actor.name,
    reason: null,
  });
  write(snap);
  return tpl;
}

export function updateRpeTemplate(
  id: string,
  patch: Partial<
    Pick<
      RpePermissionTemplate,
      "name" | "description" | "permissions" | "platformAccess" | "defaultUserType"
    >
  >,
  actor: { id: string; name: string },
  sensitiveConfirmed?: boolean,
): RpePermissionTemplate {
  const snap = read();
  const idx = snap.templates.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Template not found");
  if (patch.permissions) assertSensitiveOk(patch.permissions, sensitiveConfirmed);
  const current = snap.templates[idx]!;
  const updated: RpePermissionTemplate = {
    ...current,
    ...patch,
    permissions: patch.permissions
      ? clonePermissionMatrix(patch.permissions)
      : current.permissions,
    updatedAt: new Date().toISOString(),
  };
  snap.templates[idx] = updated;
  pushAudit(snap, {
    action: "template_updated",
    entityType: "template",
    entityId: updated.id,
    entityLabel: updated.name,
    previousValue: current.name,
    newValue: updated.name,
    changedByUserId: actor.id,
    changedByUserName: actor.name,
    reason: null,
  });
  write(snap);
  return updated;
}

export function deleteRpeTemplate(id: string, actor: { id: string; name: string }): void {
  const snap = read();
  const tpl = snap.templates.find((t) => t.id === id);
  if (!tpl) throw new Error("Template not found");
  snap.templates = snap.templates.filter((t) => t.id !== id);
  pushAudit(snap, {
    action: "template_deleted",
    entityType: "template",
    entityId: tpl.id,
    entityLabel: tpl.name,
    previousValue: tpl.name,
    newValue: null,
    changedByUserId: actor.id,
    changedByUserName: actor.name,
    reason: null,
  });
  write(snap);
}

/**
 * Delegate Role Administration to a Level-1 direct report of the Super Admin.
 * Non-recursive — delegates cannot further delegate.
 */
export function grantRpeDelegation(input: {
  delegateUserId: string;
  superAdminUserId: string;
  actor: { id: string; name: string };
}): RpeRoleAdminDelegation {
  const users = listEnterpriseUsers();
  const delegate = users.find((u) => u.id === input.delegateUserId);
  const superAdmin = users.find((u) => u.id === input.superAdminUserId);
  if (!delegate) throw new Error("Delegate user not found");
  if (!superAdmin) throw new Error("Super Administrator not found");

  // Level 1 = direct reporting employee of Super Admin
  if (!delegate.reportingManagerIds.includes(superAdmin.id)) {
    throw new Error(
      "Delegation allowed only to a direct reporting employee (Level 1) of the Super Administrator.",
    );
  }

  const snap = read();
  // revoke existing active for same delegate
  snap.delegations = snap.delegations.map((d) =>
    d.delegateUserId === input.delegateUserId && d.active
      ? { ...d, active: false, revokedAt: new Date().toISOString() }
      : d,
  );

  const row: RpeRoleAdminDelegation = {
    id: newId("dlg"),
    delegateUserId: delegate.id,
    delegateUserName: delegate.fullName,
    delegatedByUserId: input.actor.id,
    delegatedByUserName: input.actor.name,
    grantedAt: new Date().toISOString(),
    revokedAt: null,
    active: true,
  };
  snap.delegations.unshift(row);
  pushAudit(snap, {
    action: "delegation_granted",
    entityType: "delegation",
    entityId: row.id,
    entityLabel: delegate.fullName,
    previousValue: null,
    newValue: `Role Admin delegated to ${delegate.fullName}`,
    changedByUserId: input.actor.id,
    changedByUserName: input.actor.name,
    reason: "Level-1 non-recursive delegation",
  });
  write(snap);
  return row;
}

export function revokeRpeDelegation(
  delegationId: string,
  actor: { id: string; name: string },
  isSessionSuperAdmin: boolean,
): void {
  if (!isSessionSuperAdmin) {
    throw new Error("Only the Super Administrator can revoke Role Administration delegation.");
  }
  const snap = read();
  const idx = snap.delegations.findIndex((d) => d.id === delegationId);
  if (idx < 0) throw new Error("Delegation not found");
  const current = snap.delegations[idx]!;
  snap.delegations[idx] = {
    ...current,
    active: false,
    revokedAt: new Date().toISOString(),
  };
  pushAudit(snap, {
    action: "delegation_revoked",
    entityType: "delegation",
    entityId: current.id,
    entityLabel: current.delegateUserName,
    previousValue: "active",
    newValue: "revoked",
    changedByUserId: actor.id,
    changedByUserName: actor.name,
    reason: null,
  });
  write(snap);
}

function assertSensitiveOk(rows: RpePermissionMatrixRow[], confirmed?: boolean) {
  const sensitive = matrixTouchesSensitiveAdmin(rows);
  if (sensitive.length && !confirmed) {
    throw new Error(
      `Sensitive Admin access requires confirmation: ${sensitive.join(", ")}`,
    );
  }
}

export function compareRpeRoles(aId: string, bId: string) {
  const a = getRpeRole(aId);
  const b = getRpeRole(bId);
  if (!a || !b) throw new Error("Select two roles to compare");
  const modules = a.permissions.map((p) => p.moduleId);
  return modules.map((moduleId) => {
    const ar = a.permissions.find((p) => p.moduleId === moduleId)!;
    const br = b.permissions.find((p) => p.moduleId === moduleId) ?? {
      moduleId,
      view: false,
      createEdit: false,
      admin: false,
    };
    return { moduleId, a: ar, b: br };
  });
}
