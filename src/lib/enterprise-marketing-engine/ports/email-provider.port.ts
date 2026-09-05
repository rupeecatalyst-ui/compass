/**
 * CO-MARKETING-REDESIGN-014 — Provider-neutral email adapter port.
 * Marketing Engine talks to this contract — not to a named ESP.
 */

import type {
  MarketingProviderSendRequest,
  MarketingProviderSendResponse,
  MarketingProviderSignatureInput,
  MarketingProviderSignatureResult,
  MarketingProviderWebhookEnvelope,
} from "@/types/enterprise-marketing-provider-contracts";

export type MarketingEmailProviderPort = {
  readonly providerType: "fixture_dry_run";
  readonly live: false;
  readonly repliesSupported: boolean;
  send(request: MarketingProviderSendRequest): Promise<MarketingProviderSendResponse>;
  verifyWebhookSignature(input: MarketingProviderSignatureInput): MarketingProviderSignatureResult;
  parseWebhook(rawBody: string): MarketingProviderWebhookEnvelope[];
};
