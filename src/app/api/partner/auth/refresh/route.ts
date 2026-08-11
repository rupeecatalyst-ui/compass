import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
} from "@/lib/api/partner-route-utils";
import { partnerAuthService } from "@server/services/partner-gateway/partner-auth.service";
import { runWithPartnerRequestMemo } from "@server/services/partner-gateway/partner-request-memo";

/** CO-WP-102 — Partner refresh (re-validates Partner UUID binding). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const refreshToken = String(body.refreshToken || "");
    const result = await runWithPartnerRequestMemo(() =>
      partnerAuthService.refresh(refreshToken),
    );
    const res = partnerSuccess(request, result);
    res.headers.set("Server-Timing", `total;dur=${Date.now() - started}`);
    return res;
  } catch (err) {
    return partnerError(request, err);
  }
}
