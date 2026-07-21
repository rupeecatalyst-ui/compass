/**
 * Enterprise User Management store — User Accounts linked to Directory Contacts.
 * Direct create is forbidden; use grantPlatformAccessFromContact.
 */

import {
  EUM_OPERATIONAL_ROLES,
  EUM_STORAGE_KEY,
  FROZEN_CERTIFICATION_ADMIN_EMAIL,
  defaultPermissionMatrix,
  nextEmployeeId,
} from "@/constants/enterprise-user-management";
import { EUM_SEED_USERS } from "@/data/catalyst-one/enterprise-user-management/seed";
import { isDemoSeedEnabled } from "@/lib/demo-seed";
import { getRpeRole } from "@/lib/roles-permissions-engine";
import type {
  EnterpriseLoginStatus,
  EnterpriseManagedUser,
  EnterpriseModulePermission,
  EnterprisePermissionOverride,
  EnterprisePlatformAccess,
  EnterpriseUserAuditAction,
  EnterpriseUserAuditEvent,
  EnterpriseUserListFilters,
  EnterpriseUserPreferences,
  EnterpriseUserRoleAssignment,
  EnterpriseUserSortField,
  EnterpriseUserStatus,
  EnterpriseWorkTransferResult,
} from "@/types/enterprise-user-management";
import {
  computeEffectivePermissions,
  diffAsOverrides,
  computeRoleTemplateBaseline,
} from "./effective-permissions";

interface EumSnapshot {
  schemaVersion: 2;
  users: EnterpriseManagedUser[];
}

function empty(): EumSnapshot {
  if (!isDemoSeedEnabled()) {
    return { schemaVersion: 2, users: [] };
  }
  return { schemaVersion: 2, users: structuredClone(EUM_SEED_USERS).map(normalizeUser) };
}

function normalizeProductivity(
  p: EnterpriseManagedUser["productivity"],
): EnterpriseManagedUser["productivity"] {
  return {
    presenceStatus: p.presenceStatus ?? p.loginStatus ?? "offline",
    lastLoginAt: p.lastLoginAt,
    lastActiveAt: p.lastActiveAt,
    openOpportunities: p.openOpportunities ?? 0,
    activeLoanFiles: p.activeLoanFiles ?? 0,
    pendingTasks: p.pendingTasks ?? 0,
    pendingApprovals: p.pendingApprovals ?? 0,
  };
}

function deriveLoginStatus(u: Partial<EnterpriseManagedUser>): EnterpriseLoginStatus {
  if (u.loginStatus) return u.loginStatus;
  if (u.status === "suspended") return "suspended";
  if (u.status === "archived" || u.status === "resigned") return "archived";
  return "active";
}

function derivePlatformAccess(
  u: Partial<EnterpriseManagedUser>,
): EnterprisePlatformAccess {
  if (u.platformAccess) return u.platformAccess;
  if (u.status === "archived" || u.status === "resigned" || u.status === "suspended") {
    return "catalyst_one";
  }
  return "catalyst_one";
}

/** Migrate legacy localStorage / seed records to IAM v2 shape. */
const LEGACY_ROLE_IDS: Record<string, string> = {
  super_admin: "role_super_admin",
  admin: "role_admin",
  relationship_manager: "role_rm",
  credit_manager: "role_credit",
  operations: "role_ops",
  accounts: "role_accounts",
  branch_manager: "role_branch_mgr",
  management: "role_management",
};

export function normalizeUser(raw: EnterpriseManagedUser): EnterpriseManagedUser {
  const roles = (raw.roles ?? []).map((r) => {
    const roleId = LEGACY_ROLE_IDS[r.roleId] ?? r.roleId;
    return { ...r, roleId };
  });
  const permissionTemplateIds = raw.permissionTemplateIds ?? [];
  const permissionOverrides = raw.permissionOverrides ?? [];
  const base: EnterpriseManagedUser = {
    ...raw,
    contactId: raw.contactId || `contact_legacy_${raw.id}`,
    permissionTemplateIds,
    permissionOverrides,
    platformAccess: derivePlatformAccess(raw),
    loginStatus: deriveLoginStatus(raw),
    productivity: normalizeProductivity(raw.productivity),
    roles,
  };
  const hasRoleOrTpl = roles.length > 0 || permissionTemplateIds.length > 0;
  base.permissions = hasRoleOrTpl
    ? computeEffectivePermissions(base)
    : raw.permissions?.length
      ? raw.permissions
      : defaultPermissionMatrix();
  return base;
}

function read(): EumSnapshot {
  if (typeof window === "undefined") return empty();
  if (!isDemoSeedEnabled()) {
    try {
      localStorage.removeItem(EUM_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return empty();
  }
  try {
    const raw = localStorage.getItem(EUM_STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as EumSnapshot;
    if (!parsed?.users?.length) return empty();
    return {
      schemaVersion: 2,
      users: parsed.users.map((u) => normalizeUser(u)),
    };
  } catch {
    return empty();
  }
}

function write(snap: EumSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EUM_STORAGE_KEY, JSON.stringify({ ...snap, schemaVersion: 2 }));
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pushAudit(
  user: EnterpriseManagedUser,
  action: EnterpriseUserAuditAction,
  summary: string,
  actor: { id: string; name: string },
  meta?: Record<string, string>,
): EnterpriseUserAuditEvent {
  return {
    id: newId("aud"),
    userId: user.id,
    action,
    summary,
    actorId: actor.id,
    actorName: actor.name,
    at: new Date().toISOString(),
    meta,
  };
}

export function listEnterpriseUsers(): EnterpriseManagedUser[] {
  return read().users;
}

export function getEnterpriseUser(id: string): EnterpriseManagedUser | undefined {
  return read().users.find((u) => u.id === id);
}

export function getEnterpriseUserByContactId(
  contactId: string,
): EnterpriseManagedUser | undefined {
  return read().users.find((u) => u.contactId === contactId);
}

export function filterEnterpriseUsers(
  users: EnterpriseManagedUser[],
  filters: EnterpriseUserListFilters,
): EnterpriseManagedUser[] {
  const q = filters.query.trim().toLowerCase();
  return users.filter((u) => {
    if (filters.status !== "all" && u.status !== filters.status) return false;
    if (filters.branch !== "all" && !u.branches.includes(filters.branch) && u.branch !== filters.branch) {
      return false;
    }
    if (
      filters.department !== "all" &&
      !u.departments.includes(filters.department) &&
      u.department !== filters.department
    ) {
      return false;
    }
    if (filters.roleId !== "all" && !u.roles.some((r) => r.roleId === filters.roleId)) {
      return false;
    }
    if (
      filters.managerId !== "all" &&
      !u.reportingManagerIds.includes(filters.managerId)
    ) {
      return false;
    }
    if (!q) return true;
    const hay = [
      u.fullName,
      u.employeeId,
      u.email,
      u.designation,
      u.department,
      u.branch,
      u.contactId,
      ...u.roles.map((r) => r.roleLabel),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function sortEnterpriseUsers(
  users: EnterpriseManagedUser[],
  field: EnterpriseUserSortField,
  dir: "asc" | "desc",
): EnterpriseManagedUser[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...users].sort((a, b) => {
    const av = (a[field] ?? "") as string;
    const bv = (b[field] ?? "") as string;
    return av.localeCompare(bv) * mul;
  });
}

/**
 * @deprecated Direct User creation is forbidden. Use grantPlatformAccessFromContact.
 */
export function createEnterpriseUser(_input: unknown): never {
  throw new Error(
    "Direct User Account creation is not allowed. Grant Platform Access from a Directory Contact.",
  );
}

export function persistNewUser(
  user: EnterpriseManagedUser,
  actor: { id: string; name: string },
  events: { action: EnterpriseUserAuditAction; summary: string }[],
): EnterpriseManagedUser {
  const snap = read();
  if (snap.users.some((u) => u.contactId === user.contactId)) {
    throw new Error("This Directory Contact already has a User Account.");
  }
  if (snap.users.some((u) => u.email === user.email)) {
    throw new Error("A User Account with this email already exists.");
  }
  const withAudit: EnterpriseManagedUser = {
    ...user,
    audit: [
      ...events.map((e) => pushAudit(user, e.action, e.summary, actor)),
      ...user.audit,
    ],
  };
  snap.users.unshift(withAudit);
  write(snap);
  return withAudit;
}

export function refreshUserEffectivePermissions(
  id: string,
): EnterpriseManagedUser | null {
  const snap = read();
  const idx = snap.users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const current = snap.users[idx]!;
  const updated = {
    ...current,
    permissions: computeEffectivePermissions(current),
    updatedAt: new Date().toISOString(),
  };
  snap.users[idx] = updated;
  write(snap);
  return updated;
}

export function updateEnterpriseUser(
  id: string,
  patch: Partial<EnterpriseManagedUser>,
  actor: { id: string; name: string },
  auditAction: EnterpriseUserAuditAction = "profile_updated",
  auditSummary = "Profile updated",
): EnterpriseManagedUser | null {
  const snap = read();
  const idx = snap.users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  const current = snap.users[idx]!;
  if (current.isSystemProtected && patch.email && patch.email !== FROZEN_CERTIFICATION_ADMIN_EMAIL) {
    throw new Error("Frozen Business Certification Admin email cannot be changed.");
  }
  const merged: EnterpriseManagedUser = {
    ...current,
    ...patch,
    id: current.id,
    employeeId: current.employeeId,
    contactId: current.contactId,
    isSystemProtected: current.isSystemProtected,
    email: current.isSystemProtected ? current.email : (patch.email ?? current.email),
    fullName:
      patch.firstName || patch.lastName
        ? `${patch.firstName ?? current.firstName} ${patch.lastName ?? current.lastName}`.trim()
        : (patch.fullName ?? current.fullName),
    productivity: patch.productivity
      ? normalizeProductivity(patch.productivity)
      : current.productivity,
    updatedAt: new Date().toISOString(),
    audit: [pushAudit(current, auditAction, auditSummary, actor), ...current.audit],
  };
  merged.permissions = computeEffectivePermissions(merged);
  snap.users[idx] = merged;
  write(snap);
  return merged;
}

/**
 * Exit workflow — when Resigned or Archived, transfer open work to primary reporting manager.
 * Deactivates login; retains Directory Contact; never permanently deletes identity.
 */
export function setEnterpriseUserStatus(
  id: string,
  status: EnterpriseUserStatus,
  actor: { id: string; name: string },
): { user: EnterpriseManagedUser; transfer: EnterpriseWorkTransferResult | null } {
  const snap = read();
  const idx = snap.users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const current = snap.users[idx]!;

  if (current.isSystemProtected && (status === "archived" || status === "resigned" || status === "suspended")) {
    throw new Error("Frozen Business Certification Admin cannot be suspended, resigned, or archived.");
  }

  let transfer: EnterpriseWorkTransferResult | null = null;
  const now = new Date().toISOString();
  let productivity = { ...current.productivity };

  if (status === "resigned" || status === "archived") {
    const managerId = current.reportingManagerIds[0];
    const managerName = current.reportingManagerNames[0] ?? "Unassigned Manager";
    if (managerId) {
      transfer = {
        userId: id,
        transferredToManagerId: managerId,
        transferredToManagerName: managerName,
        opportunities: current.productivity.openOpportunities,
        loanFiles: current.productivity.activeLoanFiles,
        tasks: current.productivity.pendingTasks,
        approvals: current.productivity.pendingApprovals,
      };
      const mIdx = snap.users.findIndex((u) => u.id === managerId);
      if (mIdx >= 0) {
        const mgr = snap.users[mIdx]!;
        snap.users[mIdx] = {
          ...mgr,
          productivity: {
            ...mgr.productivity,
            openOpportunities:
              mgr.productivity.openOpportunities + current.productivity.openOpportunities,
            activeLoanFiles:
              mgr.productivity.activeLoanFiles + current.productivity.activeLoanFiles,
            pendingTasks: mgr.productivity.pendingTasks + current.productivity.pendingTasks,
            pendingApprovals:
              mgr.productivity.pendingApprovals + current.productivity.pendingApprovals,
          },
          updatedAt: now,
          audit: [
            pushAudit(
              mgr,
              "work_transferred",
              `Received work from ${current.fullName} on exit`,
              actor,
              { fromUserId: current.id },
            ),
            ...mgr.audit,
          ],
        };
      }
      productivity = {
        ...productivity,
        openOpportunities: 0,
        activeLoanFiles: 0,
        pendingTasks: 0,
        pendingApprovals: 0,
        presenceStatus: "offline",
      };
    }
  }

  const actionMap: Record<EnterpriseUserStatus, EnterpriseUserAuditAction> = {
    active: "activated",
    suspended: "suspended",
    on_leave: "on_leave",
    resigned: "resigned",
    archived: "archived",
  };

  const loginStatus: EnterpriseLoginStatus =
    status === "suspended"
      ? "suspended"
      : status === "archived" || status === "resigned"
        ? "archived"
        : status === "active"
          ? "active"
          : current.loginStatus;

  const events: EnterpriseUserAuditEvent[] = [
    pushAudit(current, actionMap[status], `Status set to ${status}`, actor),
  ];
  if (transfer) {
    events.unshift(
      pushAudit(
        current,
        "work_transferred",
        `Work transferred to ${transfer.transferredToManagerName}`,
        actor,
        {
          opportunities: String(transfer.opportunities),
          loanFiles: String(transfer.loanFiles),
          tasks: String(transfer.tasks),
          approvals: String(transfer.approvals),
        },
      ),
    );
  }

  const updated: EnterpriseManagedUser = {
    ...current,
    status,
    loginStatus,
    productivity,
    updatedAt: now,
    license:
      status === "suspended" || status === "archived" || status === "resigned"
        ? {
            ...current.license,
            allocated: false,
            allocatedAt: null,
            allocatedBy: null,
          }
        : current.license,
    audit: [...events, ...current.audit],
  };

  if (
    (status === "suspended" || status === "archived" || status === "resigned") &&
    current.license.allocated
  ) {
    updated.audit.unshift(
      pushAudit(current, "license_removed", "License removed on exit / suspension", actor),
    );
  }

  snap.users[idx] = updated;
  write(snap);
  return { user: updated, transfer };
}

function resolveRoleLabel(roleId: string): string {
  const rpe = getRpeRole(roleId);
  if (rpe) return rpe.name;
  const legacy = EUM_OPERATIONAL_ROLES.find((r) => r.id === roleId);
  return legacy?.label ?? roleId;
}

export function setEnterpriseUserRoles(
  id: string,
  roleIds: string[],
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  const current = getEnterpriseUser(id);
  if (!current) return null;

  // Super Admin protection — never remove last active Super Admin rights
  const removingSuper =
    current.roles.some((r) => r.roleId === "role_super_admin" || r.roleId === "super_admin") &&
    !roleIds.includes("role_super_admin") &&
    !roleIds.includes("super_admin");
  if (removingSuper && current.isSystemProtected) {
    throw new Error("Cannot remove Super Administrator rights from the protected certification admin.");
  }
  if (removingSuper) {
    const holders = listEnterpriseUsers().filter(
      (u) =>
        u.id !== id &&
        u.loginStatus === "active" &&
        u.status === "active" &&
        u.roles.some((r) => r.roleId === "role_super_admin" || r.roleId === "super_admin"),
    );
    if (holders.length === 0) {
      throw new Error("Cannot remove Super Administrator rights from the last active Super Administrator.");
    }
  }

  const now = new Date().toISOString();
  const roles: EnterpriseUserRoleAssignment[] = roleIds.map((roleId) => {
    const prev = current.roles.find((r) => r.roleId === roleId);
    return {
      roleId,
      roleLabel: resolveRoleLabel(roleId),
      assignedAt: prev?.assignedAt ?? now,
      assignedBy: prev?.assignedBy ?? actor.id,
    };
  });
  return updateEnterpriseUser(
    id,
    { roles },
    actor,
    "roles_changed",
    `Roles updated (${roles.map((r) => r.roleLabel).join(", ") || "none"})`,
  );
}

/**
 * Save desired effective matrix as user overrides (diff vs role∪template baseline).
 */
export function setEnterpriseUserPermissions(
  id: string,
  permissions: EnterpriseModulePermission[],
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  const current = getEnterpriseUser(id);
  if (!current) return null;
  const baseline = computeRoleTemplateBaseline(
    current.roles.map((r) => r.roleId),
    current.permissionTemplateIds,
  );
  const permissionOverrides = diffAsOverrides(baseline, permissions);
  return updateEnterpriseUser(
    id,
    { permissionOverrides, permissions },
    actor,
    "permission_overrides_changed",
    "User permission overrides updated",
  );
}

export function setEnterpriseUserPermissionOverrides(
  id: string,
  permissionOverrides: EnterprisePermissionOverride[],
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  return updateEnterpriseUser(
    id,
    { permissionOverrides },
    actor,
    "permission_overrides_changed",
    "User permission overrides updated",
  );
}

export function setEnterpriseUserTemplates(
  id: string,
  permissionTemplateIds: string[],
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  return updateEnterpriseUser(
    id,
    { permissionTemplateIds },
    actor,
    "templates_changed",
    `Permission templates updated (${permissionTemplateIds.length})`,
  );
}

export function setEnterpriseUserPreferences(
  id: string,
  preferences: EnterpriseUserPreferences,
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  return updateEnterpriseUser(id, { preferences }, actor, "profile_updated", "Preferences updated");
}

export function allocateEnterpriseLicense(
  id: string,
  licenseType: string,
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  const now = new Date().toISOString();
  return updateEnterpriseUser(
    id,
    {
      license: {
        allocated: true,
        licenseType,
        allocatedAt: now,
        allocatedBy: actor.id,
      },
      status: "active",
      loginStatus: "active",
    },
    actor,
    "license_allocated",
    `${licenseType} license allocated`,
  );
}

export function removeEnterpriseLicense(
  id: string,
  actor: { id: string; name: string },
): EnterpriseManagedUser | null {
  const user = getEnterpriseUser(id);
  if (user?.isSystemProtected) {
    throw new Error("Cannot remove license from frozen Business Certification Admin.");
  }
  return updateEnterpriseUser(
    id,
    {
      license: {
        allocated: false,
        licenseType: user?.license.licenseType ?? "Producer",
        allocatedAt: null,
        allocatedBy: null,
      },
    },
    actor,
    "license_removed",
    "License removed",
  );
}

export function exportEnterpriseUsersCsv(users: EnterpriseManagedUser[]): string {
  const header = [
    "Employee ID",
    "Contact ID",
    "Full Name",
    "Email",
    "Designation",
    "Department",
    "Branch",
    "Roles",
    "Platform Access",
    "Login Status",
    "Reporting Manager",
    "Status",
    "Last Login",
    "Last Active",
    "Created Date",
  ];
  const rows = users.map((u) =>
    [
      u.employeeId,
      u.contactId,
      u.fullName,
      u.email,
      u.designation,
      u.department,
      u.branch,
      u.roles.map((r) => r.roleLabel).join("; "),
      u.platformAccess,
      u.loginStatus,
      u.reportingManagerNames.join("; "),
      u.status,
      u.lastLoginAt ?? "",
      u.lastActiveAt ?? "",
      u.createdAt,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export { nextEmployeeId };
