/**
 * CO-SPRINT-119 — New Arrivals permission gate.
 */

import { NEW_ARRIVALS_ALLOWED_ROLES } from "@/constants/user-home-dashboard/new-arrivals";
import { hasAnyRole } from "@/lib/permissions";
import type { Role } from "@/constants/roles";

/**
 * Dashboard analytics / New Arrivals visibility.
 * Super Admin · Admin · Manager (covers Business / Regional / City Head mapping today).
 */
export function canViewNewArrivalsKpis(role: Role | string | null | undefined): boolean {
  if (!role) return false;
  return hasAnyRole(role as Role, [...NEW_ARRIVALS_ALLOWED_ROLES]);
}
