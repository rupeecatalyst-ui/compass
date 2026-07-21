import { ROLES, type Role } from "@/constants/roles";
import { hasMinimumRole } from "@/lib/permissions";
import type { User } from "@/types/auth";

export function canUploadDocuments(user: User | null): boolean {
  if (!user) return false;
  return hasMinimumRole(user.role, ROLES.VIEWER);
}

export function canReplaceDocuments(user: User | null): boolean {
  if (!user) return false;
  return hasMinimumRole(user.role, ROLES.ANALYST);
}

export function canRenameDocuments(user: User | null): boolean {
  if (!user) return false;
  return hasMinimumRole(user.role, ROLES.ANALYST);
}

export function canDeleteDocuments(user: User | null): boolean {
  if (!user) return false;
  return hasMinimumRole(user.role, ROLES.MANAGER);
}

export function canDownloadDocuments(user: User | null): boolean {
  if (!user) return false;
  return hasMinimumRole(user.role, ROLES.VIEWER);
}

export function documentPermissionDenied(action: string, role: Role): string {
  return `You do not have permission to ${action} documents with role ${role}.`;
}
