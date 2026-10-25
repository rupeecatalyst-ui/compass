/**
 * Governed public COMPASS entry for email and advertising campaigns.
 * Organic product pages stay on their landing routes. A campaign link
 * opens the existing application at /apply/{product}.
 */

import type { MarketingContentDocument } from "@/types/enterprise-marketing-campaign";

export const COMPASS_PUBLIC_ORIGIN_DEFAULT = "https://www.rupeecatalyst.com";

const PRODUCT_ALIASES: Record<string, string> = {
  "home-loan": "home-loan",
  home_loan: "home-loan",
  "home loan": "home-loan",
  "new home loan": "home-loan",
  "home-loan-balance-transfer": "home-loan-balance-transfer",
  home_loan_bt: "home-loan-balance-transfer",
  "home loan balance transfer": "home-loan-balance-transfer",
  "home loan bt": "home-loan-balance-transfer",
  "personal-loan": "personal-loan",
  personal_loan: "personal-loan",
  "personal loan": "personal-loan",
  "business-loan": "business-loan",
  business_loan: "business-loan",
  "business loan": "business-loan",
  "unsecured business loan": "business-loan",
  "loan-against-property": "loan-against-property",
  loan_against_property: "loan-against-property",
  "loan against property": "loan-against-property",
  "working-capital": "working-capital",
  working_capital: "working-capital",
  "working capital": "working-capital",
  "construction-finance": "construction-finance",
  construction_finance: "construction-finance",
  "construction finance": "construction-finance",
  "construction funding": "construction-finance",
  "project-finance": "project-finance",
  project_finance: "project-finance",
  "project finance": "project-finance",
};

const LANDING_TO_PRODUCT: Record<string, string> = {
  "/home-loan": "home-loan",
  "/personal-loan": "personal-loan",
  "/business-loan": "business-loan",
  "/loan-against-property": "loan-against-property",
  "/working-capital": "working-capital",
  "/construction-finance": "construction-finance",
};

export function resolveCompassCampaignProduct(value: string | null | undefined): string | null {
  const key = (value ?? "").trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ");
  if (!key) return null;
  return PRODUCT_ALIASES[key] ?? PRODUCT_ALIASES[key.replace(/ /g, "-")] ?? PRODUCT_ALIASES[key.replace(/ /g, "_")] ?? null;
}

export function compassCampaignEntryPath(productCode: string, campaignToken?: string | null): string {
  const product = resolveCompassCampaignProduct(productCode) ?? productCode.trim();
  const path = `/apply/${encodeURIComponent(product)}`;
  const token = campaignToken?.trim();
  if (!token) return path;
  return `${path}?campaign=${encodeURIComponent(token)}`;
}

export function compassPublicOrigin(env: Record<string, string | undefined> = process.env): string {
  const configured = env.COMPASS_PUBLIC_ORIGIN?.trim() || env.NEXT_PUBLIC_COMPASS_URL?.trim();
  return (configured || COMPASS_PUBLIC_ORIGIN_DEFAULT).replace(/\/$/, "");
}

export function compassCampaignEntryUrl(input: {
  productCode: string;
  campaignToken?: string | null;
  origin?: string;
}): string {
  return `${input.origin?.replace(/\/$/, "") || compassPublicOrigin()}${compassCampaignEntryPath(input.productCode, input.campaignToken)}`;
}

/** Product implied by a public landing or apply URL, when it is one of ours. */
export function productFromCompassUrl(url: string): string | null {
  try {
    const parsed = new URL(url, COMPASS_PUBLIC_ORIGIN_DEFAULT);
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    const apply = path.match(/^\/apply\/([a-z0-9-]{2,64})$/i);
    if (apply) return resolveCompassCampaignProduct(decodeURIComponent(apply[1])) ?? decodeURIComponent(apply[1]).toLowerCase();
    const queried = parsed.searchParams.get("product");
    if (queried) {
      const fromQuery = resolveCompassCampaignProduct(queried);
      if (fromQuery) return fromQuery;
    }
    return LANDING_TO_PRODUCT[path] ?? null;
  } catch {
    return null;
  }
}

export function withCampaignEntryCtas(
  content: MarketingContentDocument,
  entryUrl: string,
): MarketingContentDocument {
  return {
    ...content,
    blocks: content.blocks.map((block) =>
      block.type === "cta" ? { ...block, props: { ...block.props, url: entryUrl } } : block,
    ),
  };
}

/** Keep a saved button label while the URL writer attaches the campaign destination. */
export function withAttributedCampaignCtas(
  content: MarketingContentDocument,
  input: { url: string; label?: string | null },
): MarketingContentDocument {
  const rewritten = withCampaignEntryCtas(content, input.url);
  const label = input.label?.trim();
  if (!label) return rewritten;
  return {
    ...rewritten,
    blocks: rewritten.blocks.map((block) =>
      block.type === "cta" ? { ...block, props: { ...block.props, label } } : block,
    ),
  };
}
