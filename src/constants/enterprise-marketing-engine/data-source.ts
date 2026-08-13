/**
 * CO-MARKETING-MKT-02 — Data source / Sheets adapter constants.
 */

/** Hard cap for browser/admin preview — never load full audiences client-side. */
export const MARKETING_SHEETS_PREVIEW_MAX_ROWS = 20 as const;

/** Hard cap for a single server stream/page read (execution later). */
export const MARKETING_SHEETS_PAGE_MAX_ROWS = 500 as const;

/** Auth reference pointing at server env credentials — never embed secrets in bindings. */
export const MARKETING_SHEETS_AUTH_REF = "env:GOOGLE_SHEETS_SERVICE_ACCOUNT" as const;

/**
 * Suggested header aliases for quality checks (case-insensitive).
 * Not hard-coded audience categories — only column-name heuristics.
 */
export const MARKETING_SHEETS_EMAIL_HEADER_ALIASES = [
  "email",
  "email address",
  "e-mail",
  "mail",
] as const;

export const MARKETING_SHEETS_PHONE_HEADER_ALIASES = [
  "phone",
  "mobile",
  "mobile number",
  "phone number",
  "whatsapp",
] as const;

export const MARKETING_SHEETS_EXTERNAL_KEY_HEADER_ALIASES = [
  "external key",
  "external_id",
  "external id",
  "source key",
  "row key",
  "prospect id",
  "audience id",
] as const;

/** Logical required-field groups for marketing eligibility (not Contact create). */
export const MARKETING_SHEETS_REQUIRED_IDENTITY_GROUPS = [
  "email_or_phone",
] as const;
