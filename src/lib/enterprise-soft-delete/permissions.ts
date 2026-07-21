/**
 * CO-SPRINT-119 — Soft-delete role gates (SSOT).
 */

import { SOFT_DELETE_ROLES } from "@/constants/enterprise-soft-delete";

export function canSoftDelete(role: string): boolean {
  return (SOFT_DELETE_ROLES.canSoftDelete as readonly string[]).includes(role);
}

export function canRestoreSoftDeleted(role: string): boolean {
  return (SOFT_DELETE_ROLES.canRestore as readonly string[]).includes(role);
}

export function canPermanentlyDelete(role: string): boolean {
  return (SOFT_DELETE_ROLES.canPermanentDelete as readonly string[]).includes(role);
}

export function assertSoftDeletePermission(role: string): void {
  if (!canSoftDelete(role)) {
    throw Object.assign(new Error("You do not have permission to delete this record."), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export function assertRestorePermission(role: string): void {
  if (!canRestoreSoftDeleted(role)) {
    throw Object.assign(new Error("You do not have permission to restore this record."), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export function assertPermanentDeletePermission(role: string): void {
  if (!canPermanentlyDelete(role)) {
    throw Object.assign(
      new Error("Only SUPER_ADMIN can permanently delete records."),
      { statusCode: 403, code: "FORBIDDEN" },
    );
  }
}
