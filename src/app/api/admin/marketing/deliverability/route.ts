/**
 * CO-MARKETING-REDESIGN-013 — Deliverability readiness API.
 * Honest fixture states. No DNS mutation. Does not alter inbound email.
 */

import { requireAccessToken, successResponse } from "@/lib/api/auth-route-utils";
import { fromMarketingUnknownError } from "@/lib/enterprise-marketing-engine/api-error";
import { resolveMarketingOrganizationId } from "@server/services/enterprise-marketing-engine/organization";
import { marketingDeliverabilityService } from "@server/services/enterprise-marketing-engine";

function requireAdministrator(actor: { role: string }) {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN") {
    throw Object.assign(new Error("Only administrators can view Marketing deliverability"), {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
}

async function actorCtx(actor: { userId: string; role: string }) {
  return {
    userId: actor.userId,
    role: actor.role,
    organizationId: await resolveMarketingOrganizationId(),
  };
}

export async function GET(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    return successResponse(marketingDeliverabilityService.snapshot(ctx));
  } catch (err) {
    return fromMarketingUnknownError(
      err,
      "MARKETING_DELIVERABILITY_FAILED",
      err instanceof Error ? err.message : "Deliverability request failed",
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAccessToken(request);
    requireAdministrator(actor);
    const ctx = await actorCtx(actor);
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "verify_smtp") {
      const verified = await marketingDeliverabilityService.verifySmtp(ctx);
      return successResponse(verified);
    }
    if (body.action === "dns_lookup" || body.action === "verify_email") {
      marketingDeliverabilityService.lookupDns(ctx);
    }
    return fromMarketingUnknownError(
      Object.assign(new Error("Unknown deliverability action"), { statusCode: 400, code: "INVALID_ACTION" }),
      "MARKETING_DELIVERABILITY_FAILED",
      "Unknown deliverability action",
    );
  } catch (err) {
    return fromMarketingUnknownError(
      err,
      "MARKETING_DELIVERABILITY_FAILED",
      err instanceof Error ? err.message : "Deliverability request failed",
    );
  }
}
