/**
 * CO-MARKETING-MKT-01 — Enterprise Marketing Engine client/lib barrel.
 */

export * from "./ports";
export * from "./safety";
export * from "./data-quality";
export * from "./column-mapping";
export * from "./audience-filters";
export * from "./personalization";
export * from "./content-blocks";
export * from "./email-render";
export * from "./html-sanitize";
export * from "./visual-editor";
export * from "./template-gallery";
export * from "./template-versioning";
export * from "./utm";
export * from "./asset-optimize";
export * from "./asset-mime";
export * from "./asset-fixture-storage";
export * from "./asset-alt-text";
export * from "./asset-library";
export * from "./asset-select";
export * from "./channel-contracts";
export * from "./consent-policy";
export * from "./consent-evaluate";
export * from "./consent-history";
export * from "./consent-redact";
export * from "./consent-registry";
export * from "./sender-eligibility";
export * from "./deliverability-readiness";
export * from "./provider-contracts";
export * from "./pre-publish";
export * from "./permissions";
export * from "./analytics/time-range";
export * from "./analytics/redact-fingerprint";
export * from "./analytics/derive-campaign-analytics";
export * from "./qualification/evaluate";
export * from "./qualification/match-identity";
export * from "./qualification/identity-fill";
export * from "./qualification/inbox";
export * from "./qualification/inbox-boundary";
export * from "./qualification/handoff-notification";
export * from "./routing/pick-assignee";
export * from "./home-overview";
export * from "./monitoring";
export * from "./campaign-monitoring";
export * from "./campaign-monitoring-classify";
export * from "./campaign-recipient-explorer";
export * from "./recipient-timeline";
export * from "./monitoring-retry";
export * from "./operational-health";
export * from "./ux-pagination";
export * from "./recipient-explorer";
export * from "./attribution/compose-attribution";
export * from "./api-error-map";
export {
  disabledMarketingAssetStoragePort,
  disabledMarketingCampaignExecutionPort,
  disabledMarketingDataSourcePort,
  disabledMarketingDigitalChannelPort,
  disabledMarketingDnsPort,
  disabledMarketingEmailChannelPort,
  disabledMarketingEmailDeliveryPort,
  disabledMarketingLandingPagePort,
  disabledMarketingLiveEmailProviderPort,
  disabledMarketingMessengerDeliveryPort,
  disabledMarketingNotificationPort,
  disabledMarketingQualificationHandoffPort,
  disabledMarketingRoutingPort,
  disabledMarketingSenderVerificationPort,
  disabledMarketingSmsDeliveryPort,
  disabledMarketingWhatsAppChannelPort,
} from "./disabled-ports";
