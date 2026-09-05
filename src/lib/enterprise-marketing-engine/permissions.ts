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
  MARKETING_PERMISSIONS.CAMPAIGN_SUBMIT,
  MARKETING_PERMISSIONS.SOURCE_MANAGE,
  MARKETING_PERMISSIONS.ASSET_MANAGE,
  MARKETING_PERMISSIONS.SUPPRESSION_VIEW,
  MARKETING_PERMISSIONS.SUPPRESSION_MANAGE,
  MARKETING_PERMISSIONS.QUALIFICATION_REVIEW,
  MARKETING_PERMISSIONS.ANALYTICS_VIEW,
  MARKETING_PERMISSIONS.ROUTING_MANAGE,
  MARKETING_PERMISSIONS.SENDER_MANAGE,
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

export function canViewMarketingRecipientPii(actor: MarketingPermissionActor): boolean {
  return (
    hasMarketingPermission(actor, MARKETING_PERMISSIONS.RECIPIENT_PII_VIEW) ||
    hasMarketingPermission(actor, MARKETING_PERMISSIONS.SUPPRESSION_VIEW_PII)
  );
}

export function assertCanViewMarketingRecipientPii(actor: MarketingPermissionActor): void {
  if (canViewMarketingRecipientPii(actor)) return;
  throw Object.assign(new Error("Missing marketing permission: recipient information"), {
    statusCode: 403,
    code: "MARKETING_PERMISSION_DENIED",
    permission: MARKETING_PERMISSIONS.RECIPIENT_PII_VIEW,
  });
}

export function assertCanEditMarketingCampaign(
  actor: MarketingPermissionActor,
  campaign: { governance?: { createdByUserId?: string | null } | null },
): void {
  if (hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_EDIT_ALL)) return;
  const ownerId = campaign.governance?.createdByUserId ?? null;
  const isOwner = Boolean(actor.userId && ownerId && actor.userId === ownerId);
  if (
    isOwner &&
    (hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_EDIT_OWN) ||
      hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_CREATE))
  ) {
    return;
  }
  throw Object.assign(new Error("Missing marketing permission: edit campaign"), {
    statusCode: 403,
    code: "MARKETING_PERMISSION_DENIED",
    permission: MARKETING_PERMISSIONS.CAMPAIGN_EDIT_OWN,
  });
}
