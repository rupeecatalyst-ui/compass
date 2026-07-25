/**
 * BAT #17 — Canonical assignment refs for Opportunity / Deal registries.
 * Persisted inside lendingExtension.assignedUsers (existing JSON — no schema change).
 */

export type AssignedUserRef = {
  id: string;
  name: string;
};

export const ASSIGNED_USERS_EXTENSION_KEY = "assignedUsers" as const;

export function formatAssignedUsersLabel(users: AssignedUserRef[]): string {
  if (users.length === 0) return "Unassigned";
  const primary = users[0]?.name?.trim() || "User";
  if (users.length === 1) return primary;
  return `${primary} +${users.length - 1}`;
}
