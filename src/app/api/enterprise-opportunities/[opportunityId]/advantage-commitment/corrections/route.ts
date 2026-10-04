import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import {
  correctAdvantageCommitted,
  listAdvantageCommitmentHistory,
} from "@server/services/advantage-committed/advantage-committed.service";
import { resolvePilotOrganizationId } from "@server/repositories/ecm/organization.repository";
import {
  enterpriseOpportunityApiGuard,
  mapOpportunityRouteError,
} from "@/app/api/enterprise-opportunities/_lib/route-utils";

type Ctx = { params: Promise<{ opportunityId: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const organizationId = await resolvePilotOrganizationId();
    const history = await listAdvantageCommitmentHistory({
      organizationId,
      opportunityId,
      role: actor.role,
    });
    return successResponse({ items: history });
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    return fromAuthError(mapped as { status: number; body: never });
  }
}

export async function POST(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const organizationId = await resolvePilotOrganizationId();
    const result = await correctAdvantageCommitted({
      organizationId,
      opportunityId,
      role: actor.role,
      originalAmount: String(body.originalAmount ?? ""),
      revisedAmount: String(body.revisedAmount ?? ""),
      reason: String(body.reason ?? ""),
      requestedByUserId: String(body.requestedByUserId ?? actor.userId),
      approvedByUserId: String(body.approvedByUserId ?? actor.userId),
    });
    return successResponse(result);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return errorResponse(
        mapped.status,
        mapped.body.error?.code ?? "ADVANTAGE_COMMITTED_CORRECTION_FAILED",
        mapped.body.error?.message ?? "Correction failed",
      );
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "ADVANTAGE_COMMITTED_CORRECTION_FAILED",
      mapped.body.error?.message ?? "Correction failed",
    );
  }
}
