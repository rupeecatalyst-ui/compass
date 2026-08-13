/**
 * CO-MARKETING-MKT-02 — Admin Marketing Data Sources API.
 * READ / discover / preview only. No audience import. No send. No handoff.
 */

import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { EnterpriseMarketingSafetyError } from "@/lib/enterprise-marketing-engine/safety";
import type { ApiResponse } from "@/types/api";
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
  if (err instanceof EnterpriseMarketingSafetyError) {
    return errorResponse(403, err.code, err.message);
  }
  const statusCode = (err as { statusCode?: number }).statusCode;
  const code = (err as { code?: string }).code;
  if (statusCode === 401 || statusCode === 403) {
    return fromAuthError(err as { status: number; body: ApiResponse<unknown> });
  }
  return errorResponse(
    statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    code ?? "MARKETING_DATA_SOURCE_FAILED",
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
    if (!body.spreadsheetId?.trim()) {
      return errorResponse(400, "INVALID_INPUT", "spreadsheetId is required");
    }
    const binding = marketingDataSourceService.upsertBinding(
      { userId: actor.userId, organizationId: "default" },
      {
        id: body.id,
        displayName: body.displayName?.trim() || "Marketing Data Source",
        spreadsheetId: body.spreadsheetId.trim(),
      },
    );
    return successResponse({ binding });
  } catch (err) {
    return fromUnknown(err);
  }
}
