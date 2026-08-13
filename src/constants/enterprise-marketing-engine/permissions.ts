/**
 * CO-MARKETING-MKT-01 — Marketing-specific permission keys.
 * Enforced alongside existing Auth / org / SUPER_ADMIN|ADMIN admin layout gates.
 * Does not create a parallel authentication system.
 */

export const MARKETING_PERMISSIONS = {
  COMMAND_CENTER: "admin.marketing.command_center",
  CAMPAIGN_CREATE: "admin.marketing.campaign.create",
  CAMPAIGN_APPROVE: "admin.marketing.campaign.approve",
  CAMPAIGN_SEND: "admin.marketing.campaign.send",
  SOURCE_MANAGE: "admin.marketing.source.manage",
  ASSET_MANAGE: "admin.marketing.asset.manage",
  ANALYTICS_VIEW: "admin.marketing.analytics.view",
  ROUTING_MANAGE: "admin.marketing.routing.manage",
} as const;

export type MarketingPermission =
  (typeof MARKETING_PERMISSIONS)[keyof typeof MARKETING_PERMISSIONS];

/** EUM permission matrix module id (snake_case). */
export const MARKETING_EUM_MODULE_ID = "marketing_command_center" as const;

export const MARKETING_FEATURE_PERMISSION =
  MARKETING_PERMISSIONS.COMMAND_CENTER;
