/**
 * CO-WP-REFINEMENT-006 — Partner Legal Docket (CO-WP-007 projection).
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerLegalDocketService } from "@server/services/partner-gateway/partner-legal-docket.service";
import type { PartnerLegalDocketPartnerAction } from "@/types/enterprise-partner-legal-docket";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-binding.service";

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const desk = await partnerLegalDocketService.getLegalDocketDesk(actor.userId);
    return partnerSuccess(request, desk);
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const body = (await request.json()) as {
      action?: string;
      documentId?: string | null;
    };
    const action = (body.action ?? "").trim() as PartnerLegalDocketPartnerAction;
    if (action !== "record_view" && action !== "record_download") {
      throw new PartnerGatewayError(
        "Only record_view and record_download are permitted from the Wealth Partner app. Agreement signing is not self-service until e-sign is configured.",
        "ACTION_NOT_PERMITTED",
        403,
      );
    }
    const desk = await partnerLegalDocketService.runPartnerLegalAction({
      userId: actor.userId,
      action,
      documentId: body.documentId ?? null,
    });
    return partnerSuccess(request, desk);
  } catch (err) {
    return partnerError(request, err);
  }
}
