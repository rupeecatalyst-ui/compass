/**
 * CO-MARKETING-REDESIGN-003 — Authorised workbook + source-status resolver.
 * Server-only Google credentials. Never fall back to fixture in production.
 */

import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import type { EnterpriseMarketingSheetsMode } from "@/constants/enterprise-marketing-engine/safety";
import {
  MARKETING_FIXTURE_VISIBLE_LABEL,
  MARKETING_FIXTURE_WORKBOOK_ID,
  MARKETING_NOT_CONFIGURED_LABEL,
  type MarketingSheetsSourceStatus,
} from "@/constants/enterprise-marketing-engine/authorised-workbook";

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

function currentSheetsMode(): EnterpriseMarketingSheetsMode {
  const raw = (process.env.ENTERPRISE_MARKETING_SHEETS_MODE ?? "fixture").trim().toLowerCase();
  if (raw === "fixture" || raw === "live" || raw === "off") return raw;
  return "fixture";
}

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function googleCredentialsConfigured(): boolean {
  return Boolean(env("GOOGLE_SHEETS_CLIENT_EMAIL") && env("GOOGLE_SHEETS_PRIVATE_KEY"));
}

export function readAuthorisedSpreadsheetIdFromEnv(): string | null {
  const primary = env("ENTERPRISE_MARKETING_AUTHORISED_SPREADSHEET_ID");
  if (primary) return primary;
  const legacy = env("MARKETING_SHEETS_DEFAULT_SPREADSHEET_ID");
  return legacy || null;
}

export function isMarketingFixtureExplicitlyAllowed(): boolean {
  const raw = env("ENTERPRISE_MARKETING_ALLOW_FIXTURE").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Fixture is never a silent production fallback.
 * Production-like Prisma persistence requires an explicit allow flag.
 */
export function isMarketingFixtureRuntimeAllowed(): boolean {
  if (currentSheetsMode() !== "fixture") return false;
  if (isMarketingFixtureExplicitlyAllowed()) return true;
  if (isEnterprisePersistencePrisma()) return false;
  return true;
}

export function resolveMarketingSheetsSourceStatus(): MarketingSheetsSourceResolution {
  const sheetsMode = currentSheetsMode();
  const googleConfigured = googleCredentialsConfigured();
  const authorisedFromEnv = readAuthorisedSpreadsheetIdFromEnv();
  const fixtureAllowed = isMarketingFixtureRuntimeAllowed();

  if (sheetsMode === "off") {
    return {
      status: "OFF",
      sheetsMode,
      authorisedWorkbookId: null,
      authorisedWorkbookDisplayName: null,
      googleCredentialsConfigured: googleConfigured,
      fixtureAllowed: false,
      label: "OFF",
      notice: "Marketing Sheets access is switched off.",
    };
  }

  if (sheetsMode === "live") {
    if (!googleConfigured || !authorisedFromEnv) {
      return {
        status: "NOT_CONFIGURED",
        sheetsMode,
        authorisedWorkbookId: authorisedFromEnv,
        authorisedWorkbookDisplayName: env("MARKETING_SHEETS_DEFAULT_DISPLAY_NAME") || null,
        googleCredentialsConfigured: googleConfigured,
        fixtureAllowed: false,
        label: "NOT_CONFIGURED",
        notice: MARKETING_NOT_CONFIGURED_LABEL,
      };
    }
    return {
      status: "LIVE",
      sheetsMode,
      authorisedWorkbookId: authorisedFromEnv,
      authorisedWorkbookDisplayName:
        env("MARKETING_SHEETS_DEFAULT_DISPLAY_NAME") || "Authorised Marketing Master",
      googleCredentialsConfigured: true,
      fixtureAllowed: false,
      label: "LIVE GOOGLE SHEETS (server-side, read-only)",
      notice:
        "Using the organisation-authorised Google workbook. Credentials stay on the server and are never sent to the browser.",
    };
  }

  // fixture mode
  if (!fixtureAllowed) {
    return {
      status: "NOT_CONFIGURED",
      sheetsMode,
      authorisedWorkbookId: null,
      authorisedWorkbookDisplayName: null,
      googleCredentialsConfigured: googleConfigured,
      fixtureAllowed: false,
      label: "NOT_CONFIGURED",
      notice: MARKETING_NOT_CONFIGURED_LABEL,
    };
  }

  return {
    status: "FIXTURE",
    sheetsMode,
    authorisedWorkbookId: MARKETING_FIXTURE_WORKBOOK_ID,
    authorisedWorkbookDisplayName: "Controlled Fixture — Marketing Master (non-production)",
    googleCredentialsConfigured: googleConfigured,
    fixtureAllowed: true,
    label: "FIXTURE",
    notice: MARKETING_FIXTURE_VISIBLE_LABEL,
  };
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
