/**
 * Super Admin production Marketing switch.
 * Persists in the audit ledger. Does not launch a campaign or send email.
 */

import { errorResponse, requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import {
  isMarketingProductionLiveEnabled,
  setMarketingProductionLiveEnabled,
} from "@server/services/enterprise-marketing-engine/production-mode.service";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Marketing production mode"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const enabled = await isMarketingProductionLiveEnabled(await resolveMarketingOrganizationId());
    return successResponse({ enabled, automaticSending: false });
  } catch (err) {
    return fromMarketingUnknownError(
      err,
      "MARKETING_PRODUCTION_MODE_FAILED",
      err instanceof Error ? err.message : "Failed to read Marketing production mode",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    if (actor.role !== "SUPER_ADMIN") {
      return errorResponse(403, "FORBIDDEN", "Only a Super Admin can change Marketing production mode");
    }
    const body = (await request.json().catch(() => ({}))) as { enabled?: boolean };
    if (typeof body.enabled !== "boolean") {
      return errorResponse(400, "INVALID_INPUT", "enabled must be true or false");
    }
    const result = await setMarketingProductionLiveEnabled({
      organizationId: await resolveMarketingOrganizationId(),
      actorUserId: actor.userId,
      enabled: body.enabled,
    });
    return successResponse({ ...result, automaticSending: false });
  } catch (err) {
    return fromMarketingUnknownError(
      err,
      "MARKETING_PRODUCTION_MODE_FAILED",
      err instanceof Error ? err.message : "Failed to update Marketing production mode",
    );
  }
}
