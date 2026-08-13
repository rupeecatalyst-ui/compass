/**
 * CO-MARKETING-MKT-01 — Digital Campaign Port (contract only).
 * Provider-neutral — do not hard-code a single ad network.
 */

export type MarketingDigitalSyncRequest = {
  campaignId: string;
  campaignVersionId: string;
  externalAccountRef: string;
  payload: Record<string, unknown>;
};

export type MarketingDigitalChannelPort = {
  syncCampaign(request: MarketingDigitalSyncRequest): Promise<{
    accepted: boolean;
    externalCampaignId?: string;
    errorCode?: string;
  }>;
};
