/**
 * Official Rupee Catalyst email logo.
 * The bytes stay at public/brand/rupee-catalyst-logo.png.
 * Email clients receive the existing HTTPS file. The unapproved Marketing draft is not served.
 */

import { RUPEE_CATALYST_OFFICIAL_LOGO_ALT, RUPEE_CATALYST_OFFICIAL_LOGO_SRC } from "@/constants/rupee-catalyst-brand";

export const RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL =
  "https://catalyst-one.rupeecatalyst.com/brand/rupee-catalyst-logo.png" as const;

/** Draft Marketing asset used by the Home Loan image block. It is not approved and is not a logo file. */
export const HOME_LOAN_UNAPPROVED_DRAFT_LOGO_ASSET_ID =
  "mkt-asset-cmrtlilr60001weys1xv2uu5t-1792922255957-d-j28469" as const;

export const OFFICIAL_EMAIL_LOGO_WIDTH_PX = 180;

export function isOfficialRupeeCatalystLogoUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url || url === RUPEE_CATALYST_OFFICIAL_LOGO_SRC) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "catalyst-one.rupeecatalyst.com" &&
      parsed.pathname === RUPEE_CATALYST_OFFICIAL_LOGO_SRC
    );
  } catch {
    return false;
  }
}

export function isUnapprovedHomeLoanDraftLogoUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url.includes(HOME_LOAN_UNAPPROVED_DRAFT_LOGO_ASSET_ID)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.pathname.includes(`/api/marketing/public-assets/${HOME_LOAN_UNAPPROVED_DRAFT_LOGO_ASSET_ID}`);
  } catch {
    return false;
  }
}

/**
 * Resolve an email image address.
 * The official mark and the known unapproved Home Loan draft both render the official PNG.
 * Every other address is left unchanged for the caller's safety check.
 */
export function resolveMarketingEmailImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";
  if (isOfficialRupeeCatalystLogoUrl(url) || isUnapprovedHomeLoanDraftLogoUrl(url)) {
    return RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL;
  }
  return url;
}

export function officialEmailLogoAlt(alt: string): string {
  const value = alt.trim();
  return value || RUPEE_CATALYST_OFFICIAL_LOGO_ALT;
}
