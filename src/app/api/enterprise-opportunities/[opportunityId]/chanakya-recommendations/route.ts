import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/api/auth-route-utils";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { chanakyaAssessmentDraftSchema, recommendForChanakyaOpportunity } from "@server/services/enterprise-opportunity/chanakya-recommendations";
import { enterpriseOpportunityApiGuard } from "../../_lib/route-utils";

/** Read-only assessment; POST keeps declared financial inputs out of URLs. */
export async function POST(request: Request, context: { params: Promise<{ opportunityId: string }> }) {
  try {
    requireAccessToken(request);
    enterpriseOpportunityApiGuard();
    const { opportunityId } = await context.params;
    // Same employee-token and organization-scoped lookup as Opportunity GET.
    const opportunity = await enterpriseOpportunityService.getOpportunity(opportunityId);
    const parsed = chanakyaAssessmentDraftSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false }, { status: 400 });
    const data = await recommendForChanakyaOpportunity(opportunity, parsed.data);
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error
      && [401, 403, 404, 503].includes(Number(error.status)) ? Number(error.status) : 400;
    const reason = typeof error === "object" && error !== null && "message" in error ? error.message : null;
    const missingInputs = status === 400 && reason === "DURABLE_ASSESSMENT_INPUT_REQUIRED"
      ? ["monthlyIncome", "obligations", "propertyValue"]
      : status === 400 && reason === "BT_OUTSTANDING_REQUIRED" ? ["btOutstanding"] : [];
    return NextResponse.json({ success: false, error: {
      code: missingInputs.length ? "ASSESSMENT_INPUT_REQUIRED" : "RECOMMENDATION_UNAVAILABLE", missingInputs,
    } }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
