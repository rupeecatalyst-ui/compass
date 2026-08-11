import {
  partnerError,
  partnerOptionsResponse,
  partnerSuccess,
  requirePartnerAccessToken,
  assertTokenPartnerIdentity,
} from "@/lib/api/partner-route-utils";
import { partnerBusinessService } from "@server/services/partner-gateway/partner-business.service";

type Ctx = { params: Promise<{ opportunityId: string }> };

export async function OPTIONS(request: Request) {
  return partnerOptionsResponse(request);
}

export async function GET(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const activities = await partnerBusinessService.listActivities(actor.userId, opportunityId);
    return partnerSuccess(request, { activities });
  } catch (err) {
    return partnerError(request, err);
  }
}

/** CO-WP-ACCESS-001 — Add Activity / Notepad (independent of EDIT entitlement). */
export async function POST(request: Request, context: Ctx) {
  try {
    const actor = requirePartnerAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      body?: string;
      kindLabel?: string;
      partnerId?: string;
    };
    assertTokenPartnerIdentity(actor, body.partnerId);
    const detail = await partnerBusinessService.addActivity(
      actor.userId,
      decodeURIComponent(opportunityId),
      {
        title: body.title,
        body: body.body || "",
        kindLabel: body.kindLabel,
      },
    );
    return partnerSuccess(request, detail, 201);
  } catch (err) {
    return partnerError(request, err);
  }
}
