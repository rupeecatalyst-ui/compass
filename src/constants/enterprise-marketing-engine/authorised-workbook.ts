/**
 * CO-MARKETING-REDESIGN-003 — Organisation-scoped authorised workbook.
 * Administrators cannot enter an arbitrary spreadsheet ID.
 */

export const MARKETING_FIXTURE_WORKBOOK_ID = "fixture-marketing-master" as const;

export const MARKETING_SHEETS_SOURCE_STATUSES = [
  "OFF",
  "FIXTURE",
  "LIVE",
  "NOT_CONFIGURED",
] as const;

export type MarketingSheetsSourceStatus = (typeof MARKETING_SHEETS_SOURCE_STATUSES)[number];

export const MARKETING_FIXTURE_VISIBLE_LABEL =
  "FIXTURE MODE — controlled non-production dataset. Not live Google Sheets." as const;

export const MARKETING_NOT_CONFIGURED_LABEL =
  "NOT_CONFIGURED — Google Sheets is not available. Fixture data is not being used." as const;

export const MARKETING_WORKBOOK_CONNECTION_STATES = [
  "CONNECTED",
  "CONFIGURATION_REQUIRED",
  "ACCESS_REVOKED",
  "VALIDATION_FAILED",
] as const;

export type MarketingWorkbookConnectionState =
  (typeof MARKETING_WORKBOOK_CONNECTION_STATES)[number];

export const MARKETING_WORKBOOK_CONNECTION_LABELS: Record<
  MarketingWorkbookConnectionState,
  string
> = {
  CONNECTED: "Connected",
  CONFIGURATION_REQUIRED: "Configuration Required",
  ACCESS_REVOKED: "Access Revoked",
  VALIDATION_FAILED: "Validation Failed",
};
