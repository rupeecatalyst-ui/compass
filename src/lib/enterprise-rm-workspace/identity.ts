/**
 * CO-BIZ-005 — Normalize RM identity from existing auth session (no new auth).
 */

import type { RmIdentity } from "@/types/enterprise-rm-workspace";

export type RmSessionUser = {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  department?: string | null;
  employeeId?: string | null;
} | null;

export function resolveRmIdentity(user: RmSessionUser): RmIdentity {
  const userId = user?.id?.trim() || "";
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.employeeId?.trim() ||
    "Relationship Manager";
  const assigneeRef = userId
    ? `user:${userId}`
    : user?.employeeId?.trim()
      ? `employee:${user.employeeId.trim()}`
      : "employee:rm-001";
  const roleLabel = (user?.role || "VIEWER")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");

  return {
    userId,
    assigneeRef,
    displayName,
    roleLabel,
    department: user?.department?.trim() || undefined,
  };
}
