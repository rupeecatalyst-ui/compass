/**
 * CO-MARKETING-MKT-02 — Data source / Sheets adapter constants.
 */

/** Hard cap for browser/admin preview — never load full audiences client-side. */
export const MARKETING_SHEETS_PREVIEW_MAX_ROWS = 20 as const;

/**
 * Hard cap for one server stream page.
 * Google Sheets counts each values read, not each row, against
 * "Read requests per minute per user" (60). A 500-row page turns a
 * 60,000-row worksheet into more than 60 reads and stops the scan.
 * 2,500 rows stays under that per-minute budget for one full-master pass.
 */
export const MARKETING_SHEETS_PAGE_MAX_ROWS = 2500 as const;

/** Leave headroom under the 60 read-requests-per-minute-per-user quota. */
export const MARKETING_SHEETS_READS_PER_MINUTE = 40 as const;

/** In-process Google Sheets read cache. Mapping/preview reuse only — not freeze completeness. */
export const MARKETING_SHEETS_READ_CACHE_TTL_MS = 60_000 as const;

/** Max extra attempts after the first Google Sheets read on 429/quota. */
export const MARKETING_SHEETS_QUOTA_MAX_RETRIES = 3 as const;

export const MARKETING_SHEETS_QUOTA_ERROR_CODE = "SHEETS_QUOTA_EXCEEDED" as const;

export const MARKETING_SHEETS_QUOTA_USER_MESSAGE =
  "Google Sheets read quota was exceeded (reads per minute per user). Eligibility and snapshot counts were not updated from a partial or stale sheet. Wait, then retry." as const;

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

export const MARKETING_SHEETS_CONSENT_HEADER_ALIASES = [
  "consent",
  "marketing consent",
  "email consent",
  "opt-in",
  "opt in",
  "opted in",
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
