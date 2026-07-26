/**
 * GO-LIVE P0 — Lender Registry maintenance permissions.
 * Super Admin and Administration (ADMIN) may create / edit / archive / publish.
 * All authenticated users may compare published programs on /lenders.
 */
import { ROLES, type Role } from "@/constants/roles";

export function canMaintainEnterpriseLenderRegistry(role: Role | string | undefined | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function canComparePublishedLenderPrograms(role: Role | string | undefined | null): boolean {
  return Boolean(role);
}
