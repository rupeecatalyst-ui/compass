import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import {
  enterpriseOpportunityApiGuard,
  mapOpportunityRouteError,
} from "@/app/api/enterprise-opportunities/_lib/route-utils";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import { previewDocumentRequestOperationalEmail } from "@server/services/enterprise-communication-center/operational-email-dispatch.service";

type Ctx = { params: Promise<{ opportunityId: string }> };

/** POST — preview server-resolved recipients for document_request (no send). */
export async function POST(request: Request, context: Ctx) {
  try {
    enterpriseOpportunityApiGuard();
    requireAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { dealId?: string };
    const opp = await enterpriseOpportunityService.getOpportunity(opportunityId);
    const preview = await previewDocumentRequestOperationalEmail({
      organizationId: opp.organizationId,
      opportunityId: opp.id,
      dealId: body.dealId?.trim() || null,
    });
    return successResponse(preview);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as Parameters<typeof fromAuthError>[0]);
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "DOC_REQ_EMAIL_PREVIEW_FAILED",
      mapped.body.error?.message ?? "Failed to preview document request recipients",
    );
  }
}
