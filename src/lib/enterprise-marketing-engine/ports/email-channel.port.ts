/**
 * CO-MARKETING-MKT-01 / MKT-07 — Email channel port (legacy alias).
 * Prefer MarketingEmailDeliveryPort for new integrations.
 */

export type {
  MarketingEmailDeliveryRequest as MarketingEmailSendRequest,
  MarketingEmailDeliveryResult as MarketingEmailSendResult,
} from "@/types/enterprise-marketing-email-delivery";

export type MarketingEmailWebhookEvent = {
  providerEventId: string;
  type:
    | "delivery"
    | "bounce"
    | "complaint"
    | "open"
    | "click"
    | "unsubscribe";
  providerMessageId?: string;
  payload: Record<string, unknown>;
};

/** @deprecated Use MarketingEmailDeliveryPort — retained for MKT-01 port registry. */
export type MarketingEmailChannelPort = {
  send(
    request: import("@/types/enterprise-marketing-email-delivery").MarketingEmailDeliveryRequest,
  ): Promise<import("@/types/enterprise-marketing-email-delivery").MarketingEmailDeliveryResult>;
  ingestWebhook?(event: MarketingEmailWebhookEvent): Promise<void>;
};
