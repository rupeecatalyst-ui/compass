/**
 * CO-MARKETING-MKT-01 — Disabled port stubs (incapable of live side effects).
 */

import type { MarketingAssetStoragePort } from "./ports/asset-storage.port";
import type { MarketingCampaignExecutionPort } from "./ports/campaign-execution.port";
import type { MarketingDataSourcePort } from "./ports/data-source.port";
import type { MarketingDigitalChannelPort } from "./ports/digital-channel.port";
import type { MarketingEmailChannelPort } from "./ports/email-channel.port";
import type { MarketingLandingPagePort } from "./ports/landing-page.port";
import type { MarketingMessengerDeliveryPort } from "./ports/messenger-delivery.port";
import type { MarketingNotificationPort } from "./ports/notification.port";
import type { MarketingQualificationHandoffPort } from "./ports/qualification-handoff.port";
import type { MarketingRoutingPort } from "./ports/routing.port";
import type { MarketingSmsDeliveryPort } from "./ports/sms-delivery.port";
import type { MarketingWhatsAppChannelPort } from "./ports/whatsapp-channel.port";
import { EnterpriseMarketingSafetyError } from "./safety";

function blocked(operation: string): never {
  throw new EnterpriseMarketingSafetyError(operation);
}

export const disabledMarketingDataSourcePort: MarketingDataSourcePort = {
  providerType: "GOOGLE_SHEETS",
  listBindings: async () => blocked("dataSource.listBindings"),
  discoverDatasets: async () => blocked("dataSource.discoverDatasets"),
  streamRows: async () => blocked("dataSource.streamRows"),
};

export const disabledMarketingEmailChannelPort: MarketingEmailChannelPort = {
  send: async () => blocked("email.send"),
};

/** MKT-07 — delivery port blocked when email mode is off. */
export const disabledMarketingEmailDeliveryPort = {
  providerType: "disabled",
  deliver: async () => blocked("email.delivery"),
};

export const disabledMarketingDnsPort = {
  lookup: async () => blocked("dns.lookup"),
  mutate: async () => blocked("dns.mutate"),
};

export const disabledMarketingSenderVerificationPort = {
  sendVerificationEmail: async () => blocked("sender.verify_email"),
};

export const disabledMarketingWhatsAppChannelPort: MarketingWhatsAppChannelPort = {
  send: async () => blocked("whatsapp.send"),
};

export const disabledMarketingWhatsAppDeliveryPort = {
  providerType: "disabled",
  deliver: async () => blocked("whatsapp.delivery"),
};

export const disabledMarketingDigitalChannelPort: MarketingDigitalChannelPort = {
  syncCampaign: async () => blocked("digital.launch"),
};

export const disabledMarketingSmsDeliveryPort: MarketingSmsDeliveryPort = {
  providerType: "disabled",
  deliver: async () => blocked("sms.delivery"),
};

export const disabledMarketingMessengerDeliveryPort: MarketingMessengerDeliveryPort = {
  providerType: "disabled",
  deliver: async () => blocked("messenger.delivery"),
};

export const disabledMarketingLandingPagePort: MarketingLandingPagePort = {
  publish: async () => blocked("landing_page.publish"),
};

export const disabledMarketingCampaignExecutionPort: MarketingCampaignExecutionPort = {
  tickBatch: async () => blocked("execution.tickBatch"),
  pause: async () => blocked("execution.pause"),
  resume: async () => blocked("execution.resume"),
};

export const disabledMarketingAssetStoragePort: MarketingAssetStoragePort = {
  put: async () => blocked("asset.put"),
  archive: async () => blocked("asset.archive"),
};

export const disabledMarketingNotificationPort: MarketingNotificationPort = {
  notifyAssignee: async () => blocked("notification.notifyAssignee"),
};

export const disabledMarketingRoutingPort: MarketingRoutingPort = {
  assign: async () => blocked("routing.assign"),
};

export const disabledMarketingQualificationHandoffPort: MarketingQualificationHandoffPort = {
  handoff: async () => blocked("qualification.handoff"),
};

export const disabledMarketingLiveEmailProviderPort = {
  providerType: "live_disabled",
  live: false as const,
  repliesSupported: false,
  send: async () => blocked("email.provider.live"),
  verifyWebhookSignature: () => blocked("email.provider.live_webhook"),
  parseWebhook: () => blocked("email.provider.live_parse"),
};
