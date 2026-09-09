import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/api/auth-route-utils";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import { prisma } from "@server/lib/prisma";
import { projectExpertSla } from "@server/services/compass-customer-gateway/compass-expert-sla.service";
import { borrowerSlaCopy } from "@/lib/home-loan-recommendation/working-hour-sla";

export async function GET(
  request: Request,
  context: { params: Promise<{ opportunityId: string }> },
) {
  try {
    requireAccessToken(request);
    const { opportunityId } = await context.params;
    const organizationId = await resolvePilotOrganizationId();
    const assessment = await prisma.compassHomeLoanAssessment.findFirst({
      where: { organizationId, opportunityId },
      include: { slaEvents: { orderBy: { createdAt: "desc" }, take: 40 } },
    });
    if (!assessment) {
      return NextResponse.json({ assessment: null });
    }
    const sla = await projectExpertSla(opportunityId);
    return NextResponse.json({
      assessment: {
        ...assessment,
        expertSla: sla,
        borrowerCopy: sla ? borrowerSlaCopy(sla.state, sla.queuedUntilOpen) : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load COMPASS assessment." },
      { status: 400 },
    );
  }
}
