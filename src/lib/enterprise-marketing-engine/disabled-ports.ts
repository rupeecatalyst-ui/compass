/**
 * CO-MARKETING-MKT-01 — Disabled port stubs (incapable of live side effects).
 */

import type { MarketingAssetStoragePort } from "./ports/asset-storage.port";
import type { MarketingCampaignExecutionPort } from "./ports/campaign-execution.port";
import type { MarketingDataSourcePort } from "./ports/data-source.port";
import type { MarketingDigitalChannelPort } from "./ports/digital-channel.port";
import type { MarketingEmailChannelPort } from "./ports/email-channel.port";
import type { MarketingNotificationPort } from "./ports/notification.port";
import type { MarketingQualificationHandoffPort } from "./ports/qualification-handoff.port";
import type { MarketingRoutingPort } from "./ports/routing.port";
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
