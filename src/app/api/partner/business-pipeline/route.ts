import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";
import { runWithPartnerRequestMemo } from "@server/services/partner-gateway/partner-request-memo";

/** CO-WP-BUSINESS-001 / CO-WP-PERF-002 — My Business Pipeline Workspace. */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  const started = Date.now();
  try {
    return await runWithPartnerRequestMemo(async () => {
      const actor = requirePartnerAccessToken(request);
      const pipeline = await partnerBusinessService.getBusinessPipeline(actor.userId);
      const res = partnerSuccess(request, pipeline);
      res.headers.set("Server-Timing", `total;dur=${Date.now() - started}`);
      return res;
    });
  } catch (err) {
    return partnerError(request, err);
  }
}
