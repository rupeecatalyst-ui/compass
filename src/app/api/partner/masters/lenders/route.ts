import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerLenderMasterService } from "@server/services/partner-gateway/partner-lender-master.service";

/**
 * CO-WP-LENDER-SSOT-001 / CC-SSOT-001 — Partner Lender Registry search.
 * SSOT: Catalyst One Enterprise Lender Registry (Prisma) via server service.
 * Must NOT call browser HTTP auth client / Soft Go-Live local masters.
 */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePartnerAccessToken(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    // CO-LENDER-SSOT-REMEDIATE-001 — empty q returns full active set; typed q returns all matches.
    const lenders = await partnerLenderMasterService.searchPartnerEnterpriseLenders(q, 5000);
    return partnerSuccess(request, { lenders });
  } catch (err) {
    return partnerError(request, err);
  }
}
