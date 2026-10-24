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
