import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
} from "@/lib/api/partner-route-utils";
import { partnerAuthService } from "@server/services/partner-gateway/partner-auth.service";

/** CO-WP-102 — Public health for Partner API Gateway connectivity. */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const health = await partnerAuthService.health();
    const status = health.persistence === "prisma" ? 200 : 503;
    return partnerSuccess(request, health, status);
  } catch (err) {
    return partnerError(request, err);
  }
}
