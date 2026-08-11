/**
 * CO-WP-EXP-001 — Partner Saarthi ask (authorized data only).
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerSaarthiService } from "@server/services/partner-gateway/partner-saarthi.service";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-binding.service";

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const body = (await request.json().catch(() => ({}))) as { question?: string };
    if (!body.question?.trim()) {
      throw new PartnerGatewayError("question is required", "VALIDATION", 400);
    }
    const result = await partnerSaarthiService.ask(actor.userId, body.question);
    return partnerSuccess(request, result);
  } catch (err) {
    return partnerError(request, err);
  }
}
