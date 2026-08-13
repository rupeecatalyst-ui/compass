/**
 * CO-MARKETING-MKT-05 — Marketing permission resolution (no parallel auth system).
 * Save never grants approve. CAMPAIGN_SEND remains unusable while execution is off.
 */

import { MARKETING_PERMISSIONS, type MarketingPermission } from "@/constants/enterprise-marketing-engine";

export type MarketingPermissionActor = {
  userId?: string;
  role?: string;
  organizationId?: string | null;
  /** Explicit grants (e.g. from EUM later). */
  marketingPermissions?: string[];
};

const ADMIN_DEFAULT: MarketingPermission[] = [
  MARKETING_PERMISSIONS.COMMAND_CENTER,
  MARKETING_PERMISSIONS.CAMPAIGN_CREATE,
  MARKETING_PERMISSIONS.SOURCE_MANAGE,
  MARKETING_PERMISSIONS.ASSET_MANAGE,
  MARKETING_PERMISSIONS.ANALYTICS_VIEW,
  MARKETING_PERMISSIONS.ROUTING_MANAGE,
];

export function resolveMarketingPermissions(actor: MarketingPermissionActor): Set<string> {
  const role = (actor.role ?? "").toUpperCase();
  const extra = actor.marketingPermissions ?? [];
  if (role === "SUPER_ADMIN") {
    return new Set([...Object.values(MARKETING_PERMISSIONS), ...extra]);
  }
  if (role === "ADMIN") {
    return new Set([...ADMIN_DEFAULT, ...extra]);
  }
  return new Set(extra);
}

export function hasMarketingPermission(
  actor: MarketingPermissionActor,
  permission: MarketingPermission,
): boolean {
  return resolveMarketingPermissions(actor).has(permission);
}

export function assertMarketingPermission(
  actor: MarketingPermissionActor,
  permission: MarketingPermission,
): void {
  if (hasMarketingPermission(actor, permission)) return;
  throw Object.assign(
    new Error(`Missing marketing permission: ${permission}`),
    { statusCode: 403, code: "MARKETING_PERMISSION_DENIED", permission },
  );
}
