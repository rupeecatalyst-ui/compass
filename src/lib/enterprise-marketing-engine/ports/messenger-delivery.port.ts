/**
 * CO-MARKETING-REDESIGN-018 — Messenger delivery port (inactive).
 */

export type MarketingMessengerDeliveryRequest = {
  idempotencyKey: string;
  organizationId: string;
  campaignId: string;
  recipientFingerprint: string;
  templateRef?: string | null;
};

export type MarketingMessengerDeliveryPort = {
  readonly providerType: string;
  deliver(request: MarketingMessengerDeliveryRequest): Promise<never>;
};
