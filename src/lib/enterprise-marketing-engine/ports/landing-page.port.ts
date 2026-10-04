/**
 * CO-MARKETING-REDESIGN-018 — Landing-page campaign port (inactive).
 */

export type MarketingLandingPagePublishRequest = {
  campaignId: string;
  pagePath: string;
};

export type MarketingLandingPagePort = {
  publish(request: MarketingLandingPagePublishRequest): Promise<never>;
};
