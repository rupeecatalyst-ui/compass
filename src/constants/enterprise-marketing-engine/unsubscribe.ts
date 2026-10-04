/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Public marketing unsubscribe constants.
 * Tokens are opaque. Raw email never appears in the URL. No live send.
 */

export const MARKETING_UNSUBSCRIBE_TOKEN_VERSION = 1 as const;

export const MARKETING_UNSUBSCRIBE_TOKEN_TTL_MS = 730 * 24 * 60 * 60 * 1000;

export const MARKETING_UNSUBSCRIBE_SECRET_ENV = "ENTERPRISE_MARKETING_UNSUBSCRIBE_SECRET" as const;

export const MARKETING_PUBLIC_UNSUBSCRIBE_PATH = "/marketing/unsubscribe" as const;

export const MARKETING_UNSUBSCRIBE_GENERIC_INVALID =
  "This link is not valid or has expired." as const;

export const MARKETING_UNSUBSCRIBE_CONFIRM_COPY =
  "Unsubscribe from marketing emails from Rupee Catalyst. Transactional and operational messages are not affected." as const;

export const MARKETING_UNSUBSCRIBE_SUCCESS_COPY =
  "You have been unsubscribed from marketing emails. Transactional and operational messages are not affected." as const;

export const MARKETING_UNSUBSCRIBE_ALREADY_COPY =
  "Your marketing email preference is already updated. Transactional and operational messages are not affected." as const;

export const MARKETING_UNSUBSCRIBE_CHANNEL = "EMAIL" as const;
