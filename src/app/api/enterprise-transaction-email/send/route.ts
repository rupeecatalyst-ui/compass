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
import { dispatchOperationalTransactionEmail } from "@server/services/enterprise-communication-center/operational-email-dispatch.service";

/** POST — unified server-side transaction operational email (RecipientRouter + SMTP). */
export async function POST(request: Request) {
  try {
    if (!isEnterprisePersistencePrisma()) {
      return errorResponse(503, "PERSISTENCE_REQUIRED", "Requires prisma persistence");
    }
    enterpriseOpportunityApiGuard();
    const actor = requireAccessToken(request);

    const body = (await request.json().catch(() => ({}))) as {
      opportunityId?: string;
      dealId?: string | null;
      eventType?: string;
      primaryToRole?: TransactionPrimaryToRole;
      internalUserId?: string | null;
      subject?: string;
      textBody?: string;
      customerDisplayName?: string | null;
      opportunityReference?: string | null;
    };

    const opportunityId = String(body.opportunityId || "").trim();
    if (!opportunityId) {
      return errorResponse(400, "OPPORTUNITY_REQUIRED", "opportunityId is required");
    }

    const eventType = String(body.eventType || "customer_communication");
    if (!isCustomerFacingRecipientEvent(eventType)) {
      return errorResponse(400, "UNSUPPORTED_EVENT", `Unsupported event type: ${eventType}`);
    }

    const subject = String(body.subject || "").trim();
    const textBody = String(body.textBody || "").trim();
    if (!subject || !textBody) {
      return errorResponse(400, "SUBJECT_BODY_REQUIRED", "Subject and message body are required");
    }

    const opp = await enterpriseOpportunityService.getOpportunity(opportunityId);
    const actorName = actor.email || actor.userId || "Relationship Manager";

    const result = await dispatchOperationalTransactionEmail({
      organizationId: opp.organizationId,
      eventType,
      opportunityId: opp.id,
      dealId: body.dealId?.trim() || null,
      actorUserId: actor.userId,
      actorName,
      subject,
      textBody,
      primaryToRole: body.primaryToRole ?? "customer",
      internalUserId: body.internalUserId ?? null,
      customerDisplayName:
        body.customerDisplayName?.trim() || opp.primaryContactName || null,
      opportunityReference: body.opportunityReference?.trim() || opp.opportunityNumber || null,
      sourceSystem: "operational_email",
    });

    return successResponse(result);
  } catch (err) {
    const mapped = mapOpportunityRouteError(err);
    if (mapped.status === 401 || mapped.status === 404 || mapped.status === 503) {
      return fromAuthError(mapped as Parameters<typeof fromAuthError>[0]);
    }
    return errorResponse(
      mapped.status,
      mapped.body.error?.code ?? "TXN_EMAIL_SEND_FAILED",
      mapped.body.error?.message ?? "Failed to send transaction email",
    );
  }
}
