/**
 * CO-WP-ACCESS-001A — Partner Deal Activity / Notepad.
 */
import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
  assertTokenPartnerIdentity,
} from "@/lib/api/partner-route-utils";
import { partnerDealService } from "@server/services/partner-gateway/partner-deal.service";

type Ctx = { params: Promise<{ dealId: string }> };

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { dealId } = await context.params;
    const activities = await partnerDealService.listActivities(
      actor.userId,
      decodeURIComponent(dealId),
    );
    return partnerSuccess(request, { activities });
  } catch (err) {
    return partnerError(request, err);
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { dealId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      body?: string;
      partnerId?: string;
    };
    assertTokenPartnerIdentity(actor, body.partnerId);
    const detail = await partnerDealService.addActivity(
      actor.userId,
      decodeURIComponent(dealId),
      { title: body.title, body: body.body || "" },
    );
    return partnerSuccess(request, detail, 201);
  } catch (err) {
    return partnerError(request, err);
  }
}
