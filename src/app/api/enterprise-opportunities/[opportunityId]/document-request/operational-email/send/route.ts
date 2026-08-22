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
import { dispatchDocumentRequestOperationalEmail } from "@server/services/enterprise-communication-center/operational-email-dispatch.service";

type Ctx = { params: Promise<{ opportunityId: string }> };

/** POST — server-side document_request operational email (RecipientRouter + SMTP). */
export async function POST(request: Request, context: Ctx) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);
    const { opportunityId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      uploadUrl?: string;
      customerDisplayName?: string;
      loanProduct?: string;
      borrowerType?: string;
      constitution?: string;
      asReminder?: boolean;
      testSubject?: string;
      documentSummary?: string;
      dealId?: string;
    };

    const uploadUrl = String(body.uploadUrl || "").trim();
    if (!uploadUrl || !uploadUrl.startsWith("http")) {
      return errorResponse(
        400,
        "UPLOAD_URL_REQUIRED",
        "A valid secure upload URL is required.",
      );
    }

    const opp = await enterpriseOpportunityService.getOpportunity(opportunityId);
    const actorName = actor.email || actor.userId || "Relationship Manager";

    const result = await dispatchDocumentRequestOperationalEmail({
      organizationId: opp.organizationId,
      opportunityId: opp.id,
      opportunityNumber: opp.opportunityNumber,
      dealId: body.dealId?.trim() || null,
      actorUserId: actor.userId,
      actorName,
      uploadUrl,
      customerDisplayName: String(body.customerDisplayName || opp.primaryContactName || "Customer"),
      loanProduct: String(body.loanProduct || opp.productLabel || "Loan"),
      borrowerType: String(body.borrowerType || "N/A"),
      constitution: String(body.constitution || "N/A"),
      asReminder: Boolean(body.asReminder),
      testSubject: body.testSubject ? String(body.testSubject) : undefined,
      documentSummary: body.documentSummary ? String(body.documentSummary) : undefined,
    });

    return successResponse(result);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as Parameters<typeof fromAuthError>[0]);
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "DOC_REQ_EMAIL_SEND_FAILED",
      mapped.body.error?.message ?? "Failed to send document request email",
    );
  }
}
