/**
 * CO-MARKETING-MKT-07 — Provider-neutral Email Delivery Port.
 * Marketing Engine talks to this port — not to Hostinger, Gmail, SendGrid, SES, etc.
 */

import type {
  MarketingEmailDeliveryRequest,
  MarketingEmailDeliveryResult,
} from "@/types/enterprise-marketing-email-delivery";

export type MarketingEmailDeliveryPort = {
  readonly providerType: string;
  /** Submit one idempotent delivery unit. */
  deliver(request: MarketingEmailDeliveryRequest): Promise<MarketingEmailDeliveryResult>;
};
