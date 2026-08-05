import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";
import type { PartnerOpportunityCreateInput } from "@/types/enterprise-partner-business";

/** CO-WP-DEVELOPMENT-WAVE-001 — Partner opportunities list / create (placeholder). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const rows = await partnerBusinessService.listOpportunities(actor.userId);
    return partnerSuccess(request, { opportunities: rows });
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const body = (await request.json().catch(() => ({}))) as PartnerOpportunityCreateInput;
    const created = await partnerBusinessService.createOpportunity(actor.userId, body);
    return partnerSuccess(request, created, 201);
  } catch (err) {
    return partnerError(request, err);
  }
}
