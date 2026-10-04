import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/api/auth-route-utils";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { completeExpertContact } from "@server/services/compass-customer-gateway/compass-expert-sla.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  try {
    const actor = requireAccessToken(request);
    if (!["SUPER_ADMIN", "ADMIN", "MANAGER", "ANALYST"].includes(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { outcome?: string };
    const organizationId = await resolvePilotOrganizationId();
    const updated = await completeExpertContact({
      organizationId,
      opportunityId,
      outcome: body.outcome || "connected",
      actorUserId: actor.userId,
    });
    return NextResponse.json({
      ok: true,
      assessment: { id: updated.id, expertSlaState: updated.expertSlaState },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record contact outcome.";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
