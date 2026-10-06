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
import { resolveDocumentWorkspaceAccess } from "@server/services/document-workspace/document-workspace-access.service";
import { enforceMandatoryInitiatingSenderCc } from "@/lib/enterprise-communication-center/initiating-sender-cc";
import {
  previewOperationalTransactionEmail,
} from "@server/services/enterprise-communication-center/operational-email-dispatch.service";

/** POST — preview server-resolved TO/CC for transaction operational email. */
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
    };

    const opportunityId = String(body.opportunityId || "").trim();
    if (!opportunityId) {
      return errorResponse(400, "OPPORTUNITY_REQUIRED", "opportunityId is required");
    }

    const eventType = String(body.eventType || "customer_communication");
    if (!isCustomerFacingRecipientEvent(eventType)) {
      return errorResponse(400, "UNSUPPORTED_EVENT", `Unsupported event type: ${eventType}`);
    }

    const authorised = await resolveDocumentWorkspaceAccess({ userId: actor.userId, capability: "share", opportunityId, dealId: body.dealId });

    const result = await previewOperationalTransactionEmail({
      organizationId: authorised.organizationId,
      eventType,
      opportunityId: authorised.opportunityId,
      dealId: authorised.dealId,
      primaryToRole: body.primaryToRole ?? "customer",
      internalUserId: body.internalUserId ?? null,
      includePrimaryTo: body.includePrimaryTo,
      toRecipients: body.toRecipients,
      ccRecipients: body.ccRecipients,
    });

    const senderCc = enforceMandatoryInitiatingSenderCc({
      to: result.recipientResolution.to,
      cc: result.recipientResolution.cc,
      initiatingUser: { id: authorised.actor.userId, email: authorised.actor.email, isActive: authorised.actor.isActive },
    });
    if (!senderCc.ok) return errorResponse(422, senderCc.code, "Your sender email could not be verified.");
    if (result.recipientResolution.ok) {
      result.recipientResolution.to = senderCc.to;
      result.recipientResolution.cc = senderCc.cc;
    }

    return successResponse({ ...result, initiatingSender: {
      id: authorised.actor.userId, name: authorised.actor.displayName, email: senderCc.senderEmail,
    } });
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
