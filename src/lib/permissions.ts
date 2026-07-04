import { ROLE_HIERARCHY, type Role } from "@/constants/roles";
import type { User } from "@/types/auth";

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function hasAnyRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

export function canAccessRoute(user: User | null, allowedRoles?: Role[]): boolean {
  if (!user) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return hasAnyRole(user.role, allowedRoles);
}

export function getFullName(user: Pick<User, "firstName" | "lastName">): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
