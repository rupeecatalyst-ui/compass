/**
 * CO-MARKETING-MKT-01 — Enterprise Marketing Engine client/lib barrel.
 */

export * from "./ports";
export * from "./safety";
export * from "./data-quality";
export * from "./audience-filters";
export * from "./personalization";
export * from "./content-blocks";
export * from "./email-render";
export * from "./utm";
export * from "./asset-optimize";
export * from "./pre-publish";
export * from "./permissions";
export * from "./analytics/time-range";
export * from "./analytics/redact-fingerprint";
export * from "./analytics/derive-campaign-analytics";
export * from "./qualification/evaluate";
export * from "./qualification/match-identity";
export * from "./qualification/handoff-notification";
export * from "./routing/pick-assignee";
export {
  disabledMarketingAssetStoragePort,
  disabledMarketingCampaignExecutionPort,
  disabledMarketingDataSourcePort,
  disabledMarketingDigitalChannelPort,
  disabledMarketingEmailChannelPort,
  disabledMarketingNotificationPort,
  disabledMarketingQualificationHandoffPort,
  disabledMarketingRoutingPort,
  disabledMarketingWhatsAppChannelPort,
} from "./disabled-ports";
