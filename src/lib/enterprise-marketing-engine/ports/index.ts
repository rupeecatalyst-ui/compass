/**
 * CO-MARKETING-MKT-01 — Port barrel (contracts only — no provider adapters).
 */

export type { MarketingDataSourcePort } from "./data-source.port";
export type { MarketingEmailChannelPort } from "./email-channel.port";
export type { MarketingEmailProviderPort } from "./email-provider.port";
export type { MarketingEmailDeliveryPort } from "./email-delivery.port";
export type { MarketingWhatsAppChannelPort } from "./whatsapp-channel.port";
export type { MarketingWhatsAppDeliveryPort } from "./whatsapp-delivery.port";
export type { MarketingSmsDeliveryPort } from "./sms-delivery.port";
export type { MarketingMessengerDeliveryPort } from "./messenger-delivery.port";
export type { MarketingLandingPagePort } from "./landing-page.port";
export type { MarketingDigitalChannelPort } from "./digital-channel.port";
export type { MarketingCampaignExecutionPort } from "./campaign-execution.port";
export type { MarketingAssetStoragePort } from "./asset-storage.port";
export type { MarketingNotificationPort } from "./notification.port";
export type { MarketingRoutingPort } from "./routing.port";
export type { MarketingIdentityResolutionPort, MarketingOpportunityCreatePort, MarketingQualificationHandoffPort } from "./qualification-handoff.port";
export type { MarketingAttributionReadPort } from "./attribution-read.port";

export const MARKETING_PORT_NAMES = [
  "MarketingDataSourcePort",
  "MarketingEmailChannelPort",
  "MarketingEmailDeliveryPort",
  "MarketingEmailProviderPort",
  "MarketingWhatsAppChannelPort",
  "MarketingWhatsAppDeliveryPort",
  "MarketingSmsDeliveryPort",
  "MarketingMessengerDeliveryPort",
  "MarketingLandingPagePort",
  "MarketingDigitalChannelPort",
  "MarketingCampaignExecutionPort",
  "MarketingAssetStoragePort",
  "MarketingNotificationPort",
  "MarketingRoutingPort",
  "MarketingQualificationHandoffPort",
] as const;
