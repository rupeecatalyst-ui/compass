import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerAuthService } from "@server/services/partner-gateway/partner-auth.service";
import { runWithPartnerRequestMemo } from "@server/services/partner-gateway/partner-request-memo";

/** CO-WP-102 — Partner session identity (no business registries). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  const started = Date.now();
  try {
    const actor = requirePartnerAccessToken(request);
    const session = await runWithPartnerRequestMemo(() =>
      partnerAuthService.me(actor.userId, actor.partnerId),
    );
    const res = partnerSuccess(request, session);
    res.headers.set("Server-Timing", `total;dur=${Date.now() - started}`);
    return res;
  } catch (err) {
    return partnerError(request, err);
  }
}
