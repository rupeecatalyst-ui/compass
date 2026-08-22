import {
  errorResponse,
  fromAuthError,
  requireAccessToken,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { isEnterprisePersistencePrisma } from "@/constants/enterprise-persistence";
import { isCustomerFacingRecipientEvent } from "@/lib/enterprise-communication-center/recipient-router";
import type { TransactionPrimaryToRole } from "@/lib/enterprise-communication-center/recipient-router";
import {
  enterpriseOpportunityApiGuard,
  mapOpportunityRouteError,
} from "@/app/api/enterprise-opportunities/_lib/route-utils";
import { enterpriseOpportunityService } from "@server/services/enterprise-opportunity";
import {
  dispatchOperationalTransactionEmail,
  previewOperationalTransactionEmail,
} from "@server/services/enterprise-communication-center/operational-email-dispatch.service";

/** POST — preview server-resolved TO/CC for transaction operational email. */
export async function POST(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    enterpriseOpportunityApiGuard();
    requireAccessToken(request);

    const body = (await request.json().catch(() => ({}))) as {
      opportunityId?: string;
      dealId?: string | null;
      eventType?: string;
      primaryToRole?: TransactionPrimaryToRole;
      internalUserId?: string | null;
    };

    const opportunityId = String(body.opportunityId || "").trim();
    if (!opportunityId) {
      return errorResponse(400, "OPPORTUNITY_REQUIRED", "opportunityId is required");
    }

    const eventType = String(body.eventType || "customer_communication");
    if (!isCustomerFacingRecipientEvent(eventType)) {
      return errorResponse(400, "UNSUPPORTED_EVENT", `Unsupported event type: ${eventType}`);
    }

    const opp = await enterpriseOpportunityService.getOpportunity(opportunityId);

    const result = await previewOperationalTransactionEmail({
      organizationId: opp.organizationId,
      eventType,
      opportunityId: opp.id,
      dealId: body.dealId?.trim() || null,
      primaryToRole: body.primaryToRole ?? "customer",
      internalUserId: body.internalUserId ?? null,
    });

    return successResponse(result);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as Parameters<typeof fromAuthError>[0]);
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "TXN_EMAIL_PREVIEW_FAILED",
      mapped.body.error?.message ?? "Failed to preview transaction email recipients",
    );
  }
}
