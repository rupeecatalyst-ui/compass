/**
 * BAT #17 — Canonical assignment refs for Opportunity / Deal registries.
 * Persisted inside lendingExtension (existing JSON — no schema change).
 */

export type AssignedUserRef = {
  id: string;
  name: string;
  email?: string;
  employeeId?: string;
  /** Exactly one assigned user should be Primary Owner. */
  isPrimaryOwner?: boolean;
};

/** Active user option from Enterprise User Registry (assignment picker). */
export type AssignableUserOption = {
  id: string;
  fullName: string;
  email: string;
  employeeId: string | null;
  reportingManagerId?: string | null;
};

export const ASSIGNED_USERS_EXTENSION_KEY = "assignedUsers" as const;
export const PRIMARY_OWNER_EXTENSION_KEY = "primaryOwnerUserId" as const;
/** Supervisors above assigned users — automatic Opportunity/Deal visibility. */
export const HIERARCHY_VISIBILITY_EXTENSION_KEY = "hierarchyVisibilityUserIds" as const;
/** Flat assignee user ids for Prisma JSON visibility queries (mirrors assignedUsers[].id). */
export const ASSIGNED_USER_IDS_EXTENSION_KEY = "assignedUserIds" as const;

export function formatAssignedUsersLabel(users: AssignedUserRef[]): string {
  if (users.length === 0) return "Unassigned";
  const primary =
    users.find((u) => u.isPrimaryOwner)?.name?.trim() ||
    users[0]?.name?.trim() ||
    "User";
  if (users.length === 1) return primary;
  return `${primary} +${users.length - 1}`;
}
