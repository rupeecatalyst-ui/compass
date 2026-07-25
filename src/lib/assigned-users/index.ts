/**
 * BAT #17 — Assigned Users helpers (Opportunity / Deal registries).
 * Eligible assignees = Enterprise User Registry accounts (platform employees).
 * External parties (customers, partners, lenders) are never listed.
 */

import { listEnterpriseUsers } from "@/lib/enterprise-user-management";
import type { AssignedUserRef } from "@/types/assigned-users";
import {
  ASSIGNED_USERS_EXTENSION_KEY,
  formatAssignedUsersLabel,
} from "@/types/assigned-users";
import type { Role } from "@/constants/roles";
import { ROLES } from "@/constants/roles";

export { formatAssignedUsersLabel, ASSIGNED_USERS_EXTENSION_KEY };
export type { AssignedUserRef };

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function readAssignedUsersFromExtension(
  lendingExtension: unknown,
): AssignedUserRef[] {
  const ext = asRecord(lendingExtension);
  const raw = ext[ASSIGNED_USERS_EXTENSION_KEY];
  if (!Array.isArray(raw)) return [];
  const out: AssignedUserRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!id || !name) continue;
    out.push({ id, name });
  }
  return out;
}

/** Fallback when extension is empty — single owner / RM display fields. */
export function coalesceAssignedUsers(input: {
  lendingExtension?: unknown;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
}): AssignedUserRef[] {
  const fromExt = readAssignedUsersFromExtension(input.lendingExtension);
  if (fromExt.length > 0) return fromExt;

  const id =
    input.relationshipManagerUserId?.trim() ||
    input.primaryOwnerUserId?.trim() ||
    "";
  const name = input.relationshipManagerName?.trim() || "";
  if (id && name) return [{ id, name }];
  if (name) return [{ id: id || `name:${name}`, name }];
  return [];
}

export function writeAssignedUsersIntoExtension(
  lendingExtension: unknown,
  users: AssignedUserRef[],
): Record<string, unknown> {
  const next = { ...asRecord(lendingExtension) };
  next[ASSIGNED_USERS_EXTENSION_KEY] = users.map((u) => ({
    id: u.id,
    name: u.name,
  }));
  return next;
}

/** Internal Catalyst One users only (active employment + login). */
export function listEligibleAssignedUsers(query = ""): AssignedUserRef[] {
  const q = query.trim().toLowerCase();
  return listEnterpriseUsers()
    .filter(
      (u) =>
        u.status === "active" &&
        u.loginStatus === "active" &&
        Boolean(u.fullName?.trim()),
    )
    .filter((u) => {
      if (!q) return true;
      const hay = `${u.fullName} ${u.email} ${u.employeeId} ${u.designation}`.toLowerCase();
      return hay.includes(q);
    })
    .map((u) => ({ id: u.id, name: u.fullName.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Who may edit assignments from the registry.
 * VIEWER is read-only; operational roles may manage.
 */
export function canManageRegistryAssignments(role?: Role | string | null): boolean {
  if (!role) return false;
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ADMIN ||
    role === ROLES.MANAGER ||
    role === ROLES.ANALYST
  );
}

export function buildAssignmentPatch(users: AssignedUserRef[]): {
  lendingExtensionPatch: AssignedUserRef[];
  primaryOwnerUserId: string | null;
  relationshipManagerUserId: string | null;
  relationshipManagerName: string | null;
} {
  const primary = users[0] ?? null;
  return {
    lendingExtensionPatch: users,
    primaryOwnerUserId: primary?.id ?? null,
    relationshipManagerUserId: primary?.id ?? null,
    relationshipManagerName: primary?.name ?? null,
  };
}
