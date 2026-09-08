/**
 * CO-MARKETING-REDESIGN-003 — Authorised workbook + source-status resolver.
 * Server-only Google credentials. Never fall back to fixture in production.
 */

import {
  isMarketingFixtureRuntimeAllowed,
  operationalMarketingSheetsMode,
  requestedMarketingSheetsMode,
  type EnterpriseMarketingSheetsMode,
} from "@/constants/enterprise-marketing-engine/sheets-runtime";
import {
  MARKETING_FIXTURE_VISIBLE_LABEL,
  MARKETING_FIXTURE_WORKBOOK_ID,
  MARKETING_NOT_CONFIGURED_LABEL,
  MARKETING_WORKBOOK_CONNECTION_LABELS,
  type MarketingSheetsSourceStatus,
  type MarketingWorkbookConnectionState,
} from "@/constants/enterprise-marketing-engine/authorised-workbook";

export {
  isMarketingFixtureExplicitlyAllowed,
  isMarketingFixtureRuntimeAllowed,
  isMarketingProductionLikeRuntime,
  requestedMarketingSheetsMode,
} from "@/constants/enterprise-marketing-engine/sheets-runtime";

export type MarketingSheetsSourceResolution = {
  status: MarketingSheetsSourceStatus;
  sheetsMode: EnterpriseMarketingSheetsMode;
  authorisedWorkbookId: string | null;
  authorisedWorkbookDisplayName: string | null;
  googleCredentialsConfigured: boolean;
  fixtureAllowed: boolean;
  label: string;
  notice: string;
};

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function googleCredentialsConfigured(): boolean {
  return Boolean(env("GOOGLE_SHEETS_CLIENT_EMAIL") && env("GOOGLE_SHEETS_PRIVATE_KEY"));
}

function notConfiguredResolution(googleConfigured: boolean): MarketingSheetsSourceResolution {
  return {
    status: "NOT_CONFIGURED",
    sheetsMode: operationalMarketingSheetsMode({ status: "NOT_CONFIGURED" }),
    authorisedWorkbookId: null,
    authorisedWorkbookDisplayName: null,
    googleCredentialsConfigured: googleConfigured,
    fixtureAllowed: false,
    label: "NOT_CONFIGURED",
    notice: MARKETING_NOT_CONFIGURED_LABEL,
  };
}

export function readAuthorisedSpreadsheetIdFromEnv(): string | null {
  const primary = env("ENTERPRISE_MARKETING_AUTHORISED_SPREADSHEET_ID");
  if (primary) return primary;
  const legacy = env("MARKETING_SHEETS_DEFAULT_SPREADSHEET_ID");
  return legacy || null;
}

export function resolveMarketingSheetsSourceStatus(): MarketingSheetsSourceResolution {
  const requested = requestedMarketingSheetsMode();
  const googleConfigured = googleCredentialsConfigured();
  const authorisedFromEnv = readAuthorisedSpreadsheetIdFromEnv();
  const fixtureAllowed = isMarketingFixtureRuntimeAllowed();

  if (requested === "off") {
    return {
      status: "OFF",
      sheetsMode: "off",
      authorisedWorkbookId: null,
      authorisedWorkbookDisplayName: null,
      googleCredentialsConfigured: googleConfigured,
      fixtureAllowed: false,
      label: "OFF",
      notice: "Marketing Sheets access is switched off.",
    };
  }

  if (fixtureAllowed) {
    return {
      status: "FIXTURE",
      sheetsMode: "fixture",
      authorisedWorkbookId: MARKETING_FIXTURE_WORKBOOK_ID,
      authorisedWorkbookDisplayName: "Controlled Fixture — Marketing Master (non-production)",
      googleCredentialsConfigured: googleConfigured,
      fixtureAllowed: true,
      label: "FIXTURE",
      notice: MARKETING_FIXTURE_VISIBLE_LABEL,
    };
  }

  if (googleConfigured) {
    return {
      status: "LIVE",
      sheetsMode: "live",
      authorisedWorkbookId: authorisedFromEnv,
      authorisedWorkbookDisplayName: authorisedFromEnv
        ? env("MARKETING_SHEETS_DEFAULT_DISPLAY_NAME") || "Authorised Marketing Master"
        : null,
      googleCredentialsConfigured: true,
      fixtureAllowed: false,
      label: "LIVE GOOGLE SHEETS (server-side, read-only)",
      notice:
        "Using organisation-authorised Google workbooks. Credentials stay on the server and are never sent to the browser.",
    };
  }

  return notConfiguredResolution(googleConfigured);
}

export function assertMarketingSheetsConfigured(): MarketingSheetsSourceResolution {
  const resolved = resolveMarketingSheetsSourceStatus();
  if (resolved.status === "NOT_CONFIGURED") {
    throw Object.assign(new Error(MARKETING_NOT_CONFIGURED_LABEL), {
      statusCode: 503,
      code: "NOT_CONFIGURED",
    });
  }
  if (resolved.status === "OFF") {
    throw Object.assign(new Error("Marketing Sheets access is switched off"), {
      statusCode: 403,
      code: "SHEETS_MODE_OFF",
    });
  }
  return resolved;
}

export function assertSpreadsheetIsAuthorised(spreadsheetId: string): string {
  const resolved = assertMarketingSheetsConfigured();
  const expected = resolved.authorisedWorkbookId;
  const incoming = spreadsheetId.trim();
  if (!expected || incoming !== expected) {
    throw Object.assign(
      new Error(
        "Only the organisation-authorised Marketing workbook may be bound. Arbitrary spreadsheet IDs are rejected.",
      ),
      { statusCode: 400, code: "UNAUTHORISED_WORKBOOK" },
    );
  }
  return incoming;
}

export function marketingSheetsNotConfiguredError(): Error {
  return Object.assign(new Error(MARKETING_NOT_CONFIGURED_LABEL), {
    statusCode: 503,
    code: "NOT_CONFIGURED",
  });
}

function looksLikeGoogleDriveBrowse(value: string): boolean {
  return /drive\.google\.com|docs\.google\.com\/drive|\/folders\//i.test(value);
}

/**
 * Admin register path: fixture IDs stay locked; live mode accepts an explicit
 * spreadsheet ID (typed by an administrator) — never Drive folder browsing.
 */
export function assertWorkbookIdMayBeRegistered(spreadsheetId: string): string {
  const incoming = spreadsheetId.trim();
  if (!incoming) {
    throw Object.assign(new Error("Spreadsheet ID is required to authorise a workbook"), {
      statusCode: 400,
      code: "INVALID_INPUT",
    });
  }
  if (looksLikeGoogleDriveBrowse(incoming)) {
    throw Object.assign(
      new Error("Arbitrary Google Drive browsing is not permitted. Register a specific spreadsheet ID."),
      { statusCode: 400, code: "DRIVE_BROWSE_FORBIDDEN" },
    );
  }
  const source = assertMarketingSheetsConfigured();
  if (source.status === "FIXTURE" && incoming !== MARKETING_FIXTURE_WORKBOOK_ID) {
    throw Object.assign(
      new Error(
        "Only the organisation-authorised Marketing workbook may be bound. Arbitrary spreadsheet IDs are rejected.",
      ),
      { statusCode: 400, code: "UNAUTHORISED_WORKBOOK" },
    );
  }
  return incoming;
}

export function resolveMarketingWorkbookConnectionState(input: {
  sourceStatus: MarketingSheetsSourceStatus;
  bindingStatus?: string | null;
  healthOk?: boolean | null;
  healthCode?: string | null;
  healthMessage?: string | null;
}): MarketingWorkbookConnectionState {
  if (input.sourceStatus === "NOT_CONFIGURED" || input.sourceStatus === "OFF") {
    return "CONFIGURATION_REQUIRED";
  }
  const status = (input.bindingStatus ?? "").toUpperCase();
  if (status === "DISABLED" || status === "REVOKED") return "ACCESS_REVOKED";
  const code = (input.healthCode ?? "").toUpperCase();
  const message = (input.healthMessage ?? "").toLowerCase();
  const revoked =
    code === "ACCESS_REVOKED" ||
    code === "403" ||
    code === "401" ||
    /permission|not have access|access denied|revoked|unauth/i.test(message);
  if (input.healthOk === false && revoked) return "ACCESS_REVOKED";
  if (input.healthOk === false || status === "ERROR") return "VALIDATION_FAILED";
  return "CONNECTED";
}

export function marketingWorkbookConnectionLabel(
  state: MarketingWorkbookConnectionState,
): string {
  return MARKETING_WORKBOOK_CONNECTION_LABELS[state];
}
