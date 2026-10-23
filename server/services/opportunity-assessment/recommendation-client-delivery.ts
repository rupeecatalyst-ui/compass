import "server-only";

import { enterpriseOpportunityRepository } from "@server/repositories/enterprise-opportunity/enterprise-opportunity.repository";
import { dispatchOperationalTransactionEmail } from "@server/services/enterprise-communication-center/operational-email-dispatch.service";
import { renderAccountingInvoicePdf } from "@server/services/enterprise-accounting-invoice/invoice-pdf.service";
import { resolveAuthenticatedDocumentWorkspaceActor } from "@server/services/document-workspace/document-workspace-access.service";
import {
  appendTransactionEmailHtmlSignature,
  appendTransactionEmailSignature,
} from "@/lib/enterprise-communication-center/transaction-email-signature";
import {
  assertOpportunityReadAccess,
  resolveCaseReadAccess,
} from "@server/services/enterprise-case-visibility/read-access";
import { projectCompassRecommendationHistory } from "@/lib/compass-customer-gateway/recommendation-history";
import {
  buildRecommendationClientMessage,
  buildRecommendationPdfHtml,
  COMPASS_RECOMMENDATION_DISPATCHES_KEY,
  nextRecommendationDispatchAttempt,
  readRecommendationDispatches,
  recommendationDispatchDecision,
  recommendationDispatchSourceEventId,
  type RecommendationClientMessage,
  type RecommendationDispatchRecord,
  type RecommendationDispatchStatus,
} from "@/lib/compass-customer-gateway/recommendation-client-message";

type DeliveryFailure = { status: number; code: string; message: string };

function fail(status: number, code: string, message: string): DeliveryFailure {
  return { status, code, message };
}

function mapDeliveryStatus(status: string, failureCode: string | null): RecommendationDispatchStatus {
  if (status === "sent") return "sent";
  if (status === "disabled" || failureCode === "OPERATIONAL_DELIVERY_DISABLED" || failureCode === "PROFILE_NOT_READY" || failureCode === "SMTP_NOT_CONFIGURED") {
    return "pending";
  }
  return "failed";
}

async function loadVersion(userId: string, opportunityId: string, versionNumber: number) {
  const access = await resolveCaseReadAccess(userId);
  await assertOpportunityReadAccess(access, opportunityId);
  const opportunity = await enterpriseOpportunityRepository.findById(access.organizationId, opportunityId);
  if (!opportunity) throw fail(404, "OPPORTUNITY_NOT_FOUND", "Opportunity was not found.");
  const history = projectCompassRecommendationHistory(opportunity.snapshot);
  const version = history.versions.find((item) => item.versionNumber === versionNumber) ?? null;
  if (!version) throw fail(404, "RECOMMENDATION_VERSION_NOT_FOUND", "That recommendation version was not found.");
  const recipient = opportunity.primaryContactEmail?.trim() || "";
  const message = buildRecommendationClientMessage({
    version,
    customerName: opportunity.primaryContactName,
  });
  return { access, opportunity, version, recipient, message };
}

/** Same signature the operational sender appends, so preview and delivery match. */
async function messageAsDelivered(
  userId: string,
  message: RecommendationClientMessage,
): Promise<RecommendationClientMessage> {
  const actor = await resolveAuthenticatedDocumentWorkspaceActor({ userId });
  const name = actor.displayName?.trim() ?? "";
  return {
    ...message,
    textBody: appendTransactionEmailSignature(message.textBody, name),
    htmlBody: appendTransactionEmailHtmlSignature(message.htmlBody, name),
  };
}

export async function previewRecommendationClientMessage(input: {
  userId: string;
  opportunityId: string;
  versionNumber: number;
}): Promise<{
  recipient: string | null;
  duplicate: boolean;
  message: RecommendationClientMessage;
  opportunityReference: string;
}> {
  const loaded = await loadVersion(input.userId, input.opportunityId, input.versionNumber);
  const records = readRecommendationDispatches(loaded.opportunity.snapshot);
  return {
    recipient: loaded.recipient || null,
    duplicate: loaded.recipient
      ? recommendationDispatchDecision({
        records,
        versionNumber: input.versionNumber,
        recipient: loaded.recipient,
        resend: false,
      }) === "duplicate"
      : false,
    message: await messageAsDelivered(input.userId, loaded.message),
    opportunityReference: loaded.opportunity.opportunityNumber,
  };
}

export async function sendRecommendationClientMessage(input: {
  userId: string;
  opportunityId: string;
  versionNumber: number;
  resend: boolean;
}): Promise<{
  deliveryStatus: RecommendationDispatchStatus;
  providerAccepted: boolean;
  recipient: string;
  message: RecommendationClientMessage;
}> {
  const loaded = await loadVersion(input.userId, input.opportunityId, input.versionNumber);
  if (!loaded.recipient) throw fail(409, "CUSTOMER_EMAIL_UNAVAILABLE", "The Opportunity has no customer email address.");
  const prior = readRecommendationDispatches(loaded.opportunity.snapshot);
  if (recommendationDispatchDecision({
    records: prior,
    versionNumber: input.versionNumber,
    recipient: loaded.recipient,
    resend: input.resend,
  }) === "duplicate") {
    throw fail(409, "DUPLICATE_SEND", "This recommendation was already sent to this customer. Confirm a separate resend to send it again.");
  }
  const attempt = nextRecommendationDispatchAttempt(prior, input.versionNumber);
  const attemptedAt = new Date().toISOString();
  const baseSnapshot = loaded.opportunity.snapshot && typeof loaded.opportunity.snapshot === "object" && !Array.isArray(loaded.opportunity.snapshot)
    ? { ...(loaded.opportunity.snapshot as Record<string, unknown>) }
    : {};
  const writeDispatches = async (records: RecommendationDispatchRecord[]) => {
    await enterpriseOpportunityRepository.updateOpportunity(loaded.access.organizationId, input.opportunityId, {
      snapshot: JSON.parse(JSON.stringify({
        ...baseSnapshot,
        [COMPASS_RECOMMENDATION_DISPATCHES_KEY]: records,
      })),
      updatedBy: input.userId,
    });
  };
  const delivered = await messageAsDelivered(input.userId, loaded.message);
  const pending: RecommendationDispatchRecord = {
    versionNumber: input.versionNumber,
    recipient: loaded.recipient,
    actorUserId: input.userId,
    attemptedAt,
    deliveryStatus: "pending",
    providerStatus: null,
    failure: null,
    resend: input.resend,
  };
  await writeDispatches([...prior, pending]);
  let deliveryStatus: RecommendationDispatchStatus = "failed";
  let providerStatus: string | null = null;
  let failure: string | null = null;
  try {
    const result = await dispatchOperationalTransactionEmail({
      organizationId: loaded.access.organizationId,
      eventType: "customer_notification",
      opportunityId: input.opportunityId,
      actorUserId: input.userId,
      actorName: "CHANAKYA",
      initiation: "operator",
      sourceEventId: recommendationDispatchSourceEventId({
        opportunityId: input.opportunityId,
        versionNumber: input.versionNumber,
        attempt,
      }),
      subject: loaded.message.subject,
      textBody: loaded.message.textBody,
      htmlBody: loaded.message.htmlBody,
      primaryToRole: "customer",
      customerDisplayName: loaded.opportunity.primaryContactName,
      opportunityReference: loaded.opportunity.opportunityNumber,
      sourceSystem: "chanakya_recommendation_client_email",
    });
    deliveryStatus = mapDeliveryStatus(result.deliveryStatus, result.failureCode);
    providerStatus = result.smtpResponse ?? result.deliveryStatus;
    failure = result.failureCode;
  } catch (error) {
    deliveryStatus = "failed";
    failure = error instanceof Error ? error.message : "SEND_FAILED";
  }
  await writeDispatches([...prior, {
    ...pending,
    deliveryStatus,
    providerStatus,
    failure,
  }]);
  return {
    deliveryStatus,
    providerAccepted: deliveryStatus === "sent",
    recipient: loaded.recipient,
    message: delivered,
  };
}

export async function renderRecommendationPdf(input: {
  userId: string;
  opportunityId: string;
  versionNumber: number;
}): Promise<{ bytes: Uint8Array; filename: string }> {
  const loaded = await loadVersion(input.userId, input.opportunityId, input.versionNumber);
  const html = buildRecommendationPdfHtml({
    message: loaded.message,
    customerName: loaded.opportunity.primaryContactName,
    opportunityReference: loaded.opportunity.opportunityNumber,
    logoSrc: null,
  });
  const bytes = await renderAccountingInvoicePdf(html);
  return {
    bytes,
    filename: `${loaded.opportunity.opportunityNumber}-recommendation-${input.versionNumber}.pdf`,
  };
}
