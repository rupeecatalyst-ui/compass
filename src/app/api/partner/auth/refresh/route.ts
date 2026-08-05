import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
} from "@/lib/api/partner-route-utils";
import { partnerAuthService } from "@server/services/partner-gateway/partner-auth.service";

/** CO-WP-102 — Partner refresh (re-validates Partner UUID binding). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const refreshToken = String(body.refreshToken || "");
    const result = await partnerAuthService.refresh(refreshToken);
    return partnerSuccess(request, result);
  } catch (err) {
    return partnerError(request, err);
  }
}
