/**
 * CO-MARKETING-REDESIGN-020 — Operational health. Durable or explicitly simulated.
 * Live send remains off. Production cron is not registered.
 */

import { requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingOperationalHealthService } from "@server/services/enterprise-marketing-engine/operational-health.service";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Marketing operational health"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const organizationId = await resolveMarketingOrganizationId();
    const snapshot = await marketingOperationalHealthService.snapshot({
      organizationId,
      campaignId: url.searchParams.get("campaignId"),
    });
    return successResponse(snapshot);
  } catch (err) {
    return fromMarketingUnknownError(
      err,
      "MARKETING_OPERATIONAL_HEALTH_FAILED",
      err instanceof Error ? err.message : "Operational health request failed",
    );
  }
}
