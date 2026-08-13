/**
 * CO-MARKETING-MKT-01 / MKT-04 / MKT-06 / MKT-07 — Enterprise Marketing Engine server barrel.
 */

export { enterpriseMarketingFoundationService } from "./foundation.service";
export { marketingDataSourceService } from "./data-source.service";
export { marketingAudienceService } from "./audience.service";
export { marketingCampaignService } from "./campaign.service";
export { marketingAssetService } from "./asset.service";
export { marketingExecutionService } from "./execution.service";
export { marketingEmailDeliveryService } from "./email-delivery.service";
export { marketingWhatsAppDeliveryService } from "./whatsapp-delivery.service";
export { marketingWhatsAppTemplateStore } from "./whatsapp-template-store";
export { marketingChannelPolicyStore } from "./channel-policy-store";
export { marketingAnalyticsService } from "./analytics.service";
export { marketingEngagementEventStore } from "./engagement-event-store";
export { marketingNotificationPolicyStore } from "./notification-policy-store";
export { marketingNotificationAttemptStore } from "./notification-attempt-store";
export { marketingNotificationService } from "./notification.service";
export { marketingQualificationStore } from "./qualification-store";
export { marketingQualificationService } from "./qualification.service";
export { marketingRoutingPolicyStore } from "./routing-policy-store";
export { marketingRoutingService } from "./routing.service";
export { emitMarketingEngagementEvent } from "./engagement.service";
export { marketingCampaignStore } from "./campaign-store";
export { marketingAssetStore } from "./asset-store";
export { marketingTemplateStore, marketingReusableBlockStore } from "./template-store";
export {
  listRecentMarketingAuditEvents,
  recordMarketingAuditEvent,
} from "./audit";
export { marketingDataSourceBindingStore } from "./binding-store";
export { marketingAudienceDefinitionStore } from "./audience-definition-store";
export { marketingSuppressionStore } from "./suppression-store";
export { marketingSenderIdentityStore } from "./sender-identity-store";
