import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

type Ctx = { params: Promise<{ customerId: string }> };

/** CO-WP-JOURNEY-003 — Partner Customer Workspace aggregate. */
export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { customerId } = await context.params;
    const workspace = await partnerBusinessService.getCustomerWorkspace(
      actor.userId,
      customerId,
    );
    return partnerSuccess(request, workspace);
  } catch (err) {
    return partnerError(request, err);
  }
}
