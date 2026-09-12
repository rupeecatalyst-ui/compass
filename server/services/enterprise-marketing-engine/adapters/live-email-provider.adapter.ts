/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Live email provider extension point.
 * Isolated. No fetch, SMTP, DNS, or credential use. Connection remains hard-off.
 */

import { MARKETING_LIVE_PROVIDER_NOTICE } from "@/constants/enterprise-marketing-engine/live-email-provider";
import type { MarketingLiveEmailProviderPort } from "@/lib/enterprise-marketing-engine/ports/live-email-provider.port";
import { assertMarketingProviderConnectAllowed } from "@/lib/enterprise-marketing-engine/safety";

export function createLiveEmailProviderPort(): MarketingLiveEmailProviderPort {
  assertMarketingProviderConnectAllowed("email.provider.live.connect");
  throw new Error(MARKETING_LIVE_PROVIDER_NOTICE);
}

export function connectMarketingLiveEmailProvider(): never {
  return assertMarketingProviderConnectAllowed("email.provider.live.connect");
}

export function executeMarketingLiveEmailProviderSend(): never {
  return assertMarketingProviderConnectAllowed("email.provider.live.send");
}
