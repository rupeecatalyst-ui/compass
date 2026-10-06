import type { EmailRecipientSelections } from "@/lib/enterprise-communication-center/recipient-selection";
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
import { dispatchOperationalTransactionEmail } from "@server/services/enterprise-communication-center/operational-email-dispatch.service";
import { resolveDocumentWorkspaceAccess } from "@server/services/document-workspace/document-workspace-access.service";

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
      includePrimaryTo?: EmailRecipientSelections["includePrimaryTo"];
      toRecipients?: EmailRecipientSelections["toRecipients"];
      ccRecipients?: EmailRecipientSelections["ccRecipients"];
      subject?: string;
      textBody?: string;
      customerDisplayName?: string | null;
      opportunityReference?: string | null;
      documentIds?: string[];
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

    const authorised = await resolveDocumentWorkspaceAccess({ userId: actor.userId, capability: "share", opportunityId, dealId: body.dealId });
    const actorName = actor.email || actor.userId || "Relationship Manager";

    const result = await dispatchOperationalTransactionEmail({
      organizationId: authorised.organizationId,
      eventType,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      actorUserId: actor.userId,
      actorName,
      subject,
      textBody,
      primaryToRole: body.primaryToRole ?? "customer",
      internalUserId: body.internalUserId ?? null,
      includePrimaryTo: body.includePrimaryTo,
      toRecipients: body.toRecipients,
      ccRecipients: body.ccRecipients,
      customerDisplayName:
        authorised.lock.customerName,
      opportunityReference: authorised.lock.opportunityNumber,
      documentIds: Array.isArray(body.documentIds) ? body.documentIds : [],
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
