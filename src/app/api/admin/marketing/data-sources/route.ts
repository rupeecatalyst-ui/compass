/**
 * CO-MARKETING-MKT-02 — Admin Marketing Data Sources API.
 * READ / discover / preview only. No audience import. No send. No handoff.
 */

import {
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { marketingDataSourceService } from "@server/services/enterprise-marketing-engine";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can manage Marketing data sources"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  return fromMarketingUnknownError(
    err,
    "MARKETING_DATA_SOURCE_FAILED",
    err instanceof Error ? err.message : "Marketing data source request failed",
  );
}

/** List bindings + mode metadata */
export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const bindings = marketingDataSourceService.listBindings({
      userId: actor.userId,
      organizationId: "default",
    });
    return successResponse({
      mode: marketingDataSourceService.getMode(),
      bindings,
    });
  } catch (err) {
    return fromUnknown(err);
  }
}

/** Upsert binding metadata (spreadsheet id + display name). Never accepts credentials. */
export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const body = (await request.json().catch(() => ({}))) as {
      displayName?: string;
      spreadsheetId?: string;
      id?: string;
    };
    const binding = marketingDataSourceService.upsertBinding(
      { userId: actor.userId, organizationId: "default" },
      {
        id: body.id,
        displayName: body.displayName?.trim() || "Marketing Data Source",
        spreadsheetId: body.spreadsheetId?.trim(),
      },
    );
    return successResponse({ binding });
  } catch (err) {
    return fromUnknown(err);
  }
}
