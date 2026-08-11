import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerHomeService } from "@server/services/partner-gateway/partner-home.service";
import { runWithPartnerRequestMemo } from "@server/services/partner-gateway/partner-request-memo";

/** CO-WP-103 / CO-WP-PERF-002 — Partner Home Dashboard (progressive shell|desk). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  const started = Date.now();
  try {
    return await runWithPartnerRequestMemo(async () => {
      const actor = requirePartnerAccessToken(request);
      const url = new URL(request.url);
      const raw = (url.searchParams.get("phase") || "full").toLowerCase();
      const phase =
        raw === "shell" ? ("shell" as const) : raw === "desk" ? ("desk" as const) : ("full" as const);
      const dashboard = await partnerHomeService.getHomeDashboard(
        actor.userId,
        actor.partnerId,
        { phase },
      );
      const res = partnerSuccess(request, dashboard);
      res.headers.set("Server-Timing", `total;dur=${Date.now() - started}`);
      res.headers.set("X-Partner-Home-Phase", phase);
      return res;
    });
  } catch (err) {
    return partnerError(request, err);
  }
}
