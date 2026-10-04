/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Isolated live-provider extension point.
 * Not wired for execution. Product Owner must approve a named ESP before any implementation.
 */

import type {
  MarketingProviderSendRequest,
  MarketingProviderSendResponse,
  MarketingProviderSignatureInput,
  MarketingProviderSignatureResult,
  MarketingProviderWebhookEnvelope,
} from "@/types/enterprise-marketing-provider-contracts";

export type MarketingLiveEmailProviderKind = "awaiting_provider_decision";

export type MarketingLiveEmailProviderPort = {
  readonly providerType: MarketingLiveEmailProviderKind;
  readonly live: false;
  readonly networkCalls: 0;
  readonly connected: false;
  send(request: MarketingProviderSendRequest): Promise<MarketingProviderSendResponse>;
  connect(): never;
  verifyWebhookSignature(input: MarketingProviderSignatureInput): MarketingProviderSignatureResult;
  parseWebhook(rawBody: string): MarketingProviderWebhookEnvelope[];
};
