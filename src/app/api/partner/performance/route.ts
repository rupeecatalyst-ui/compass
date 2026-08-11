/**
 * CO-WP-COM-001 — Partner Performance desk.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerPerformanceService } from "@server/services/partner-gateway/partner-performance.service";

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const desk = await partnerPerformanceService.getPerformanceDesk(actor.userId);
    return partnerSuccess(request, desk);
  } catch (err) {
    return partnerError(request, err);
  }
}
