/**
 * CO-MARKETING-MKT-01 / MKT-09 — WhatsApp channel port (legacy alias).
 * Prefer MarketingWhatsAppDeliveryPort for new integrations.
 */

export type {
  MarketingWhatsAppDeliveryRequest as MarketingWhatsAppSendRequest,
  MarketingWhatsAppDeliveryResult,
} from "@/types/enterprise-marketing-whatsapp-delivery";

/** @deprecated Use MarketingWhatsAppDeliveryPort. */
export type MarketingWhatsAppChannelPort = {
  send(
    request: import("@/types/enterprise-marketing-whatsapp-delivery").MarketingWhatsAppDeliveryRequest,
  ): Promise<import("@/types/enterprise-marketing-whatsapp-delivery").MarketingWhatsAppDeliveryResult>;
};
