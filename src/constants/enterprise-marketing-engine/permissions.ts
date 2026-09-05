/**
 * CO-MARKETING-MKT-01 — Marketing-specific permission keys.
 * Enforced alongside existing Auth / org / SUPER_ADMIN|ADMIN admin layout gates.
 * Does not create a parallel authentication system.
 */

export const MARKETING_PERMISSIONS = {
  COMMAND_CENTER: "admin.marketing.command_center",
  RECIPIENT_PII_VIEW: "admin.marketing.recipient.pii.view",
  CAMPAIGN_CREATE: "admin.marketing.campaign.create",
  CAMPAIGN_EDIT_OWN: "admin.marketing.campaign.edit_own",
  CAMPAIGN_EDIT_ALL: "admin.marketing.campaign.edit_all",
  CAMPAIGN_SUBMIT: "admin.marketing.campaign.submit",
  CAMPAIGN_APPROVE: "admin.marketing.campaign.approve",
  CAMPAIGN_SEND: "admin.marketing.campaign.send",
  CAMPAIGN_SCHEDULE: "admin.marketing.campaign.schedule",
  CAMPAIGN_RUN: "admin.marketing.campaign.run",
  CAMPAIGN_PAUSE: "admin.marketing.campaign.pause",
  CAMPAIGN_STOP: "admin.marketing.campaign.stop",
  CAMPAIGN_RETRY: "admin.marketing.campaign.retry",
  SOURCE_MANAGE: "admin.marketing.source.manage",
  TEMPLATE_MANAGE: "admin.marketing.template.manage",
  ASSET_MANAGE: "admin.marketing.asset.manage",
  SUPPRESSION_VIEW: "admin.marketing.suppression.view",
  SUPPRESSION_MANAGE: "admin.marketing.suppression.manage",
  SUPPRESSION_EXPORT: "admin.marketing.suppression.export",
  SUPPRESSION_VIEW_PII: "admin.marketing.suppression.view_pii",
  QUALIFICATION_REVIEW: "admin.marketing.qualification.review",
  QUALIFICATION_CONVERT: "admin.marketing.qualification.convert",
  ANALYTICS_VIEW: "admin.marketing.analytics.view",
  ROUTING_MANAGE: "admin.marketing.routing.manage",
  SENDER_MANAGE: "admin.marketing.sender.manage",
  SENDER_APPROVE: "admin.marketing.sender.approve",
} as const;

/** Prompt 19 required capability labels → permission keys. */
export const MARKETING_REQUIRED_PERMISSION_CATALOGUE = [
  { label: "View Marketing", key: "COMMAND_CENTER" },
  { label: "View recipient information", key: "RECIPIENT_PII_VIEW" },
  { label: "Create campaign", key: "CAMPAIGN_CREATE" },
  { label: "Edit own campaign", key: "CAMPAIGN_EDIT_OWN" },
  { label: "Edit all campaigns", key: "CAMPAIGN_EDIT_ALL" },
  { label: "Manage audience", key: "SOURCE_MANAGE" },
  { label: "Manage templates", key: "TEMPLATE_MANAGE" },
  { label: "Manage assets", key: "ASSET_MANAGE" },
  { label: "Submit for approval", key: "CAMPAIGN_SUBMIT" },
  { label: "Approve campaign", key: "CAMPAIGN_APPROVE" },
  { label: "Schedule campaign", key: "CAMPAIGN_SCHEDULE" },
  { label: "Run campaign", key: "CAMPAIGN_RUN" },
  { label: "Pause/resume", key: "CAMPAIGN_PAUSE" },
  { label: "Stop", key: "CAMPAIGN_STOP" },
  { label: "Retry failures", key: "CAMPAIGN_RETRY" },
  { label: "Manage suppressions", key: "SUPPRESSION_MANAGE" },
  { label: "Review qualifications", key: "QUALIFICATION_REVIEW" },
  { label: "Convert qualified interest", key: "QUALIFICATION_CONVERT" },
  { label: "View analytics", key: "ANALYTICS_VIEW" },
  { label: "Configure sender/provider settings", key: "SENDER_MANAGE" },
] as const;

export type MarketingPermission =
  (typeof MARKETING_PERMISSIONS)[keyof typeof MARKETING_PERMISSIONS];

/** EUM permission matrix module id (snake_case). */
export const MARKETING_EUM_MODULE_ID = "marketing_command_center" as const;

export const MARKETING_FEATURE_PERMISSION =
  MARKETING_PERMISSIONS.COMMAND_CENTER;
