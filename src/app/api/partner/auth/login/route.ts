import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
} from "@/lib/api/partner-route-utils";
import { partnerAuthService } from "@server/services/partner-gateway/partner-auth.service";

/** CO-WP-102 — Partner login (Enterprise Identity → Partner UUID session). */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const result = await partnerAuthService.login(email, password);
    return partnerSuccess(request, result);
  } catch (err) {
    return partnerError(request, err);
  }
}
