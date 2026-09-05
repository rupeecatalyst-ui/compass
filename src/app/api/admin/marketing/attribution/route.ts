/**
 * CO-MARKETING-REDESIGN-017 — Campaign attribution dashboard API.
 * Read-only. No Opportunity / Deal / Accounting writes.
 */

import { requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingAttributionService } from "@server/services/enterprise-marketing-engine/attribution.service";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Marketing attribution"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

function fromUnknown(err: unknown) {
  return fromMarketingUnknownError(
    err,
    "MARKETING_ATTRIBUTION_FAILED",
    err instanceof Error ? err.message : "Marketing attribution request failed",
  );
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const url = new URL(request.url);
    const dashboard = await marketingAttributionService.getDashboard(
      {
        userId: actor.userId,
        role: actor.role,
        organizationId: await resolveMarketingOrganizationId(),
      },
      {
        campaignId: url.searchParams.get("campaignId"),
        product: url.searchParams.get("product"),
        ownerUserId: url.searchParams.get("ownerUserId"),
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
      },
    );
    return successResponse(dashboard);
  } catch (err) {
    return fromUnknown(err);
  }
}
