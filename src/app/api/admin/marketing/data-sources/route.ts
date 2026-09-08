/**
 * CO-MARKETING-GOOGLE-ACTIVATION-001 — Admin Marketing Data Sources API.
 * READ / discover / preview / register authorised workbooks.
 * No audience import. No send. No handoff. Credentials never accepted.
 */

import {
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { assertMarketingPermission } from "@/lib/enterprise-marketing-engine/permissions";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
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

async function actorCtx(actor: { userId: string; role: string }) {
  return {
    userId: actor.userId,
    role: actor.role,
    organizationId: await resolveMarketingOrganizationId(),
  };
}

/** List bindings + mode metadata. Operators see only active authorised workbooks. */
export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.CAMPAIGN_CREATE);
    const operatorOnly = new URL(request.url).searchParams.get("scope") === "operator";
    const bindings = await marketingDataSourceService.listBindings(ctx, { operatorOnly });
    return successResponse({
      mode: marketingDataSourceService.getMode(),
      bindings,
    });
  } catch (err) {
    return fromUnknown(err);
  }
}

/** Upsert / revoke binding metadata. Never accepts credentials. */
export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    assertMarketingPermission(ctx, MARKETING_PERMISSIONS.SOURCE_MANAGE);
    const body = (await request.json().catch(() => ({}))) as {
      action?: "register" | "revoke";
      displayName?: string;
      spreadsheetId?: string;
      id?: string;
    };
    if (body.action === "revoke") {
      if (!body.id) {
        throw Object.assign(new Error("binding id is required to revoke a workbook"), {
          statusCode: 400,
          code: "INVALID_INPUT",
        });
      }
      const binding = await marketingDataSourceService.revokeBinding(ctx, body.id);
      return successResponse({ binding });
    }
    const binding = await marketingDataSourceService.upsertBinding(ctx, {
      id: body.id,
      displayName: body.displayName?.trim() || "Marketing Data Source",
      spreadsheetId: body.spreadsheetId?.trim(),
    });
    return successResponse({ binding });
  } catch (err) {
    return fromUnknown(err);
  }
}
