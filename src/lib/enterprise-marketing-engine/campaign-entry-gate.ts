/**
 * Live Marketing CTAs must be a signed COMPASS Home Loan application URL.
 * Never fall back to the homepage or an unattributed /apply path.
 */

import { MARKETING_SMTP_BLOCK } from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import {
  compassCampaignEntryUrl,
  resolveCompassCampaignProduct,
} from "@/lib/product-journey/campaign-entry-url";

export const MARKETING_HOME_LOAN_PRODUCT = "home-loan" as const;

export type MarketingCampaignEntryDecision = {
  ok: boolean;
  url: string | null;
  code: string | null;
};

export function resolveLiveHomeLoanCampaignEntry(input: {
  product?: string | null;
  campaignToken?: string | null;
  origin?: string;
}): MarketingCampaignEntryDecision {
  const product = resolveCompassCampaignProduct(input.product);
  if (product !== MARKETING_HOME_LOAN_PRODUCT) {
    return { ok: false, url: null, code: MARKETING_SMTP_BLOCK.campaignProductInvalid };
  }
  const token = input.campaignToken?.trim() ?? "";
  if (!token) {
    return { ok: false, url: null, code: MARKETING_SMTP_BLOCK.campaignTokenMissing };
  }
  const url = compassCampaignEntryUrl({
    productCode: MARKETING_HOME_LOAN_PRODUCT,
    campaignToken: token,
    origin: input.origin,
  });
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.endsWith(`/apply/${MARKETING_HOME_LOAN_PRODUCT}`)) {
      return { ok: false, url: null, code: MARKETING_SMTP_BLOCK.campaignEntryInvalid };
    }
    if (!parsed.searchParams.get("campaign")?.trim()) {
      return { ok: false, url: null, code: MARKETING_SMTP_BLOCK.campaignTokenMissing };
    }
  } catch {
    return { ok: false, url: null, code: MARKETING_SMTP_BLOCK.campaignEntryInvalid };
  }
  return { ok: true, url, code: null };
}

const HOME_LOAN_CTA_HOSTS = new Set(["rupeecatalyst.com", "www.rupeecatalyst.com"]);
const HOME_LOAN_CTA_PATHS = new Set(["/home-loan", "/apply/home-loan"]);

/**
 * Keep an official Home Loan destination and attach the signed campaign token.
 * Other hosts and paths fall back to the signed /apply/home-loan entry.
 */
export function attributeHomeLoanCampaignDestination(input: {
  intendedUrl?: string | null;
  campaignToken?: string | null;
  product?: string | null;
  origin?: string;
}): MarketingCampaignEntryDecision {
  const product = input.product === undefined ? MARKETING_HOME_LOAN_PRODUCT : input.product;
  if (resolveCompassCampaignProduct(product) !== MARKETING_HOME_LOAN_PRODUCT) {
    return { ok: false, url: null, code: MARKETING_SMTP_BLOCK.campaignProductInvalid };
  }
  const token = input.campaignToken?.trim() ?? "";
  if (!token) {
    return { ok: false, url: null, code: MARKETING_SMTP_BLOCK.campaignTokenMissing };
  }
  const intended = input.intendedUrl?.trim();
  if (intended) {
    try {
      const parsed = new URL(intended);
      const path = parsed.pathname.replace(/\/$/, "") || "/";
      const official =
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        HOME_LOAN_CTA_HOSTS.has(parsed.hostname.toLowerCase()) &&
        HOME_LOAN_CTA_PATHS.has(path);
      if (official) {
        parsed.searchParams.set("campaign", token);
        parsed.hash = "";
        return { ok: true, url: parsed.toString(), code: null };
      }
    } catch {
      // Fall through to the signed application entry.
    }
  }
  return resolveLiveHomeLoanCampaignEntry({
    product: MARKETING_HOME_LOAN_PRODUCT,
    campaignToken: token,
    origin: input.origin,
  });
}
