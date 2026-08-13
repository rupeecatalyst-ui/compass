/**
 * CO-MARKETING-MKT-08 — UTM / tracking configuration helpers.
 */

export type MarketingUtmConfig = {
  source: string;
  medium: string;
  campaign: string;
  content?: string | null;
  term?: string | null;
};

export function emptyMarketingUtmConfig(): MarketingUtmConfig {
  return {
    source: "email",
    medium: "marketing",
    campaign: "",
    content: null,
    term: null,
  };
}

/** Append UTM query params to a URL when tracking is enabled. Never mutates relative # anchors into broken URLs. */
export function appendMarketingUtmParams(
  url: string,
  utm: MarketingUtmConfig | null | undefined,
  trackingEnabled: boolean,
): string {
  if (!trackingEnabled || !utm || !url || url === "#") return url;
  try {
    const parsed = new URL(url);
    if (utm.source) parsed.searchParams.set("utm_source", utm.source);
    if (utm.medium) parsed.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) parsed.searchParams.set("utm_campaign", utm.campaign);
    if (utm.content) parsed.searchParams.set("utm_content", utm.content);
    if (utm.term) parsed.searchParams.set("utm_term", utm.term);
    return parsed.toString();
  } catch {
    return url;
  }
}
