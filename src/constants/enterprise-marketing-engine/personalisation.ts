/**
 * CO-MARKETING-REDESIGN-008 — Personalisation catalogue + test-send safety constants.
 * Only explicitly allowlisted mapped fields become merge variables.
 */

import type { MarketingPersonalizationToken } from "./content";

export const MARKETING_PERSONALISATION_LABELS: Record<MarketingPersonalizationToken, string> = {
  firstName: "First name",
  lastName: "Last name",
  fullName: "Full name",
  city: "City",
  state: "State",
  profession: "Profession",
  company: "Company",
  companyName: "Company name",
  product: "Product interest",
  senderName: "Sender name",
};

/** Sheet columns that must never become automatic merge fields. */
export const MARKETING_PERSONALISATION_SENSITIVE_FIELDS = [
  "email",
  "mobile",
  "consent",
  "sourceStableKey",
] as const;

export const MARKETING_RESERVED_STRUCTURAL_TOKENS = ["unsubscribeUrl"] as const;

export const MARKETING_PREVIEW_DESKTOP_MAX_WIDTH = 600 as const;
export const MARKETING_PREVIEW_MOBILE_MAX_WIDTH = 360 as const;
export const MARKETING_PERSONALISATION_SAMPLE_CAP = 8 as const;

export const MARKETING_TEST_SEND_ALLOWED_DOMAINS = ["rupeecatalyst.com"] as const;

export const MARKETING_TEST_SEND_ALLOWED_ADDRESSES = ["qa@rupeecatalyst.com"] as const;

export const MARKETING_TEST_SEND_CONFIRMATION_PHRASE = "TEST" as const;

export const MARKETING_TEST_SEND_DRY_RUN_NOTICE =
  "No real email was delivered. This was a dry-run of the customer-facing render path." as const;

export const MARKETING_TEST_LANE_TITLE = "Controlled test send (dry-run)" as const;
export const MARKETING_PRODUCTION_LANE_TITLE = "Production approval & launch" as const;
