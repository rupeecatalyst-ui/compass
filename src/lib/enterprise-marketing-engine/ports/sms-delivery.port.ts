/**
 * CO-MARKETING-REDESIGN-018 — SMS delivery port (inactive).
 * Provider-neutral. Must never send.
 */

export type MarketingSmsDeliveryRequest = {
  idempotencyKey: string;
  organizationId: string;
  campaignId: string;
  recipientFingerprint: string;
  body: string;
  templateRef?: string | null;
  complianceRef?: string | null;
};

export type MarketingSmsDeliveryPort = {
  readonly providerType: string;
  deliver(request: MarketingSmsDeliveryRequest): Promise<never>;
};
