import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerAuthService } from "@server/services/partner-gateway/partner-auth.service";

/** CO-WP-102 — Partner logout. */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const actor = requirePartnerAccessToken(request);
    const body = await request.json().catch(() => ({}));
    const refreshToken =
      typeof body.refreshToken === "string" ? body.refreshToken : undefined;
    const result = await partnerAuthService.logout(refreshToken, actor.userId);
    return partnerSuccess(request, result);
  } catch (err) {
    return partnerError(request, err);
  }
}
