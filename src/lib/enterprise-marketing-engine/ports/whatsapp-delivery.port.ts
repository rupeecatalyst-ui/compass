/**
 * CO-MARKETING-MKT-09 — Provider-neutral WhatsApp Delivery Port.
 * Marketing Engine talks to this port — not Meta / Twilio / Gupshup directly.
 */

import type {
  MarketingWhatsAppDeliveryRequest,
  MarketingWhatsAppDeliveryResult,
} from "@/types/enterprise-marketing-whatsapp-delivery";

export type MarketingWhatsAppDeliveryPort = {
  readonly providerType: string;
  deliver(
    request: MarketingWhatsAppDeliveryRequest,
  ): Promise<MarketingWhatsAppDeliveryResult>;
};
