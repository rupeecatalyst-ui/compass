/**
 * BAT #17 / Enterprise User Assignment — Opportunity & Deal registries.
 *
 * Active assignees come from Enterprise User Registry (Prisma via /api/users/assignable).
 * Soft Go-Live EUM store is NOT the assignment SSOT.
 */

import { authenticatedJsonFetch } from "@/lib/api-client";
import type { AssignedUserRef, AssignableUserOption } from "@/types/assigned-users";
import {
  ASSIGNED_USERS_EXTENSION_KEY,
  ASSIGNED_USER_IDS_EXTENSION_KEY,
  HIERARCHY_VISIBILITY_EXTENSION_KEY,
  PRIMARY_OWNER_EXTENSION_KEY,
  formatAssignedUsersLabel,
} from "@/types/assigned-users";
import type { Role } from "@/constants/roles";
import { ROLES } from "@/constants/roles";

export {
  formatAssignedUsersLabel,
  ASSIGNED_USERS_EXTENSION_KEY,
  ASSIGNED_USER_IDS_EXTENSION_KEY,
  HIERARCHY_VISIBILITY_EXTENSION_KEY,
  PRIMARY_OWNER_EXTENSION_KEY,
};
export type { AssignedUserRef, AssignableUserOption };

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
    out.push({
      id,
      name,
      email: typeof row.email === "string" ? row.email : undefined,
      employeeId: typeof row.employeeId === "string" ? row.employeeId : undefined,
      isPrimaryOwner: row.isPrimaryOwner === true,
    });
  }
  return out;
}

export function readAssignedUserIdsFromExtension(
  lendingExtension: unknown,
): string[] {
  const ext = asRecord(lendingExtension);
  const flat = ext[ASSIGNED_USER_IDS_EXTENSION_KEY];
  if (Array.isArray(flat)) {
    return [
      ...new Set(
        flat
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];
  }
  return readAssignedUsersFromExtension(lendingExtension).map((u) => u.id);
}

export function readHierarchyVisibilityUserIdsFromExtension(
  lendingExtension: unknown,
): string[] {
  const ext = asRecord(lendingExtension);
  const raw = ext[HIERARCHY_VISIBILITY_EXTENSION_KEY];
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}

export function readPrimaryOwnerIdFromExtension(
  lendingExtension: unknown,
): string | null {
  const ext = asRecord(lendingExtension);
  const fromKey =
    typeof ext[PRIMARY_OWNER_EXTENSION_KEY] === "string"
      ? String(ext[PRIMARY_OWNER_EXTENSION_KEY]).trim()
      : "";
  if (fromKey) return fromKey;
  const users = readAssignedUsersFromExtension(lendingExtension);
  const marked = users.find((u) => u.isPrimaryOwner);
  return marked?.id ?? users[0]?.id ?? null;
}

/** Fallback when extension is empty — single owner / RM display fields. */
export function coalesceAssignedUsers(input: {
  lendingExtension?: unknown;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  relationshipManagerName?: string | null;
}): AssignedUserRef[] {
  const fromExt = readAssignedUsersFromExtension(input.lendingExtension);
  if (fromExt.length > 0) {
    const primaryId =
      readPrimaryOwnerIdFromExtension(input.lendingExtension) ||
      input.primaryOwnerUserId?.trim() ||
      null;
    if (!primaryId) return fromExt;
    return fromExt.map((u) => ({
      ...u,
      isPrimaryOwner: u.id === primaryId,
    }));
  }

  const id =
    input.relationshipManagerUserId?.trim() ||
    input.primaryOwnerUserId?.trim() ||
    "";
  const name = input.relationshipManagerName?.trim() || "";
  if (id && name) return [{ id, name, isPrimaryOwner: true }];
  if (name) return [{ id: id || `name:${name}`, name, isPrimaryOwner: true }];
  return [];
}

export function writeAssignedUsersIntoExtension(
  lendingExtension: unknown,
  users: AssignedUserRef[],
  options?: {
    primaryOwnerUserId?: string | null;
    hierarchyVisibilityUserIds?: string[];
  },
): Record<string, unknown> {
  const next = { ...asRecord(lendingExtension) };
  const primaryId =
    options?.primaryOwnerUserId?.trim() ||
    users.find((u) => u.isPrimaryOwner)?.id ||
    users[0]?.id ||
    null;

  next[ASSIGNED_USERS_EXTENSION_KEY] = users.map((u) => ({
    id: u.id,
    name: u.name,
    ...(u.email ? { email: u.email } : {}),
    ...(u.employeeId ? { employeeId: u.employeeId } : {}),
    isPrimaryOwner: primaryId ? u.id === primaryId : false,
  }));

  next[ASSIGNED_USER_IDS_EXTENSION_KEY] = [
    ...new Set(users.map((u) => u.id.trim()).filter(Boolean)),
  ];

  if (primaryId) {
    next[PRIMARY_OWNER_EXTENSION_KEY] = primaryId;
  } else {
    delete next[PRIMARY_OWNER_EXTENSION_KEY];
  }

  if (options?.hierarchyVisibilityUserIds) {
    next[HIERARCHY_VISIBILITY_EXTENSION_KEY] = [
      ...new Set(options.hierarchyVisibilityUserIds.filter(Boolean)),
    ];
  }

  return next;
}

/**
 * @deprecated Prefer searchAssignableUsers (Prisma Enterprise User Registry).
 * Kept for Soft Go-Live fallback only.
 */
export function listEligibleAssignedUsers(query = ""): AssignedUserRef[] {
  // Soft Go-Live path removed from picker — production uses API.
  void query;
  return [];
}

/** Active Enterprise User Registry accounts for assignment (async SSOT). */
export async function searchAssignableUsers(
  query = "",
): Promise<AssignableUserOption[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("search", query.trim());
  const qs = params.toString();
  const res = await authenticatedJsonFetch(
    `/api/users/assignable${qs ? `?${qs}` : ""}`,
  );
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { users?: AssignableUserOption[] };
    error?: { message?: string };
  };
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || `Failed to load users (${res.status})`);
  }
  return (body.data?.users ?? [])
    .filter((u) => Boolean(u.id && u.fullName?.trim()))
    .map((u) => ({
      id: u.id,
      fullName: u.fullName.trim(),
      email: u.email,
      employeeId: u.employeeId ?? null,
      reportingManagerId: u.reportingManagerId ?? null,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
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

export function buildAssignmentPatch(
  users: AssignedUserRef[],
  primaryOwnerUserId?: string | null,
): {
  lendingExtensionPatch: AssignedUserRef[];
  primaryOwnerUserId: string | null;
  relationshipManagerUserId: string | null;
  relationshipManagerName: string | null;
  hierarchySeedUserIds: string[];
} {
  const primaryId =
    primaryOwnerUserId?.trim() ||
    users.find((u) => u.isPrimaryOwner)?.id ||
    users[0]?.id ||
    null;
  const ordered = primaryId
    ? [
        ...users.filter((u) => u.id === primaryId),
        ...users.filter((u) => u.id !== primaryId),
      ]
    : users;
  const primary = ordered.find((u) => u.id === primaryId) ?? ordered[0] ?? null;

  return {
    lendingExtensionPatch: ordered.map((u) => ({
      ...u,
      isPrimaryOwner: primary ? u.id === primary.id : false,
    })),
    primaryOwnerUserId: primary?.id ?? null,
    relationshipManagerUserId: primary?.id ?? null,
    relationshipManagerName: primary?.name ?? null,
    hierarchySeedUserIds: ordered.map((u) => u.id),
  };
}
