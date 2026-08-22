/**
 * CO-C1-OPERATIONAL-EMAIL-002 — Server-side operational email dispatch.
 * document_request → RecipientRouter → ECC CUSTOMERS → Hostinger SMTP.
 */

import { isOperationalSmtpDeliveryEnabled } from "@/constants/enterprise-communication-center/operational-delivery";
import {
  buildDocumentRequestEmailBody,
  DOCUMENT_REQUEST_EMAIL_SUBJECT,
} from "@/constants/document-requests";
import { resolveSmtpSecret } from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import type { RecipientRouterResult } from "@/lib/enterprise-communication-center/recipient-router";
import type { EnterpriseCommunicationProfileRecord } from "@/types/enterprise-communication-center";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { enterpriseCommunicationCenterService } from "@server/services/enterprise-communication-center/ecc.service";
import { loadAndResolveCustomerFacingRecipients } from "@server/services/enterprise-communication-center/recipient-router.service";
import { sendOperationalSmtpMessage } from "@server/services/enterprise-communication-center/smtp-transport.service";

export type OperationalEmailPreviewResult = {
  operationalDeliveryEnabled: boolean;
  enceExternalDeliveryEnabled: false;
  eventType: "document_request";
  recipientResolution: RecipientRouterResult;
  sender: {
    profileCode: "CUSTOMERS";
    senderEmail: string | null;
    replyToEmail: string | null;
    displayName: string | null;
  } | null;
};

export type OperationalEmailDispatchResult = {
  ok: boolean;
  deliveryStatus: "sent" | "failed" | "disabled" | "recipient_unresolved";
  eventType: "document_request";
  opportunityId: string;
  dealId: string | null;
  senderProfileCode: "CUSTOMERS";
  senderEmail: string | null;
  replyToEmail: string | null;
  to: string[];
  cc: string[];
  subject: string;
  message: string;
  smtpResponse: string | null;
  failureCode: string | null;
  sourceEventId: string;
};

function resolveCustomersProfile(
  profiles: EnterpriseCommunicationProfileRecord[],
): EnterpriseCommunicationProfileRecord | null {
  return profiles.find((p) => p.profileCode === "CUSTOMERS") ?? null;
}

async function loadCustomersProfile(): Promise<EnterpriseCommunicationProfileRecord | null> {
  const profiles = await enterpriseCommunicationCenterService.listProfiles();
  return resolveCustomersProfile(profiles);
}

export async function previewDocumentRequestOperationalEmail(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
}): Promise<OperationalEmailPreviewResult> {
  const recipientResolution = await loadAndResolveCustomerFacingRecipients({
    organizationId: input.organizationId,
    eventType: "document_request",
    opportunityId: input.opportunityId,
    dealId: input.dealId ?? null,
  });

  const profile = await loadCustomersProfile();

  return {
    operationalDeliveryEnabled: isOperationalSmtpDeliveryEnabled(),
    enceExternalDeliveryEnabled: false,
    eventType: "document_request",
    recipientResolution,
    sender: profile
      ? {
          profileCode: "CUSTOMERS",
          senderEmail: profile.senderEmail,
          replyToEmail: profile.replyToEmail ?? profile.senderEmail,
          displayName: profile.displayName,
        }
      : null,
  };
}

export async function dispatchDocumentRequestOperationalEmail(input: {
  organizationId: string;
  opportunityId: string;
  opportunityNumber: string;
  dealId?: string | null;
  actorUserId: string;
  actorName: string;
  uploadUrl: string;
  customerDisplayName: string;
  loanProduct: string;
  borrowerType: string;
  constitution: string;
  asReminder?: boolean;
  testSubject?: string;
  documentSummary?: string;
}): Promise<OperationalEmailDispatchResult> {
  const sourceEventId = `doc-req-email:${input.opportunityId}:${Date.now()}`;
  const dealId = input.dealId?.trim() || null;

  const baseFailure = (
    partial: Partial<OperationalEmailDispatchResult> &
      Pick<
        OperationalEmailDispatchResult,
        "deliveryStatus" | "message" | "failureCode"
      >,
  ): OperationalEmailDispatchResult => ({
    ok: false,
    eventType: "document_request",
    opportunityId: input.opportunityId,
    dealId,
    senderProfileCode: "CUSTOMERS",
    senderEmail: partial.senderEmail ?? null,
    replyToEmail: partial.replyToEmail ?? null,
    to: partial.to ?? [],
    cc: partial.cc ?? [],
    subject: partial.subject ?? "",
    smtpResponse: partial.smtpResponse ?? null,
    sourceEventId,
    ...partial,
  });

  if (!isOperationalSmtpDeliveryEnabled()) {
    return baseFailure({
      deliveryStatus: "disabled",
      message:
        "Operational SMTP delivery is disabled (ECC_OPERATIONAL_SMTP_DELIVERY_ENABLED).",
      failureCode: "OPERATIONAL_DELIVERY_DISABLED",
    });
  }

  const recipients = await loadAndResolveCustomerFacingRecipients({
    organizationId: input.organizationId,
    eventType: "document_request",
    opportunityId: input.opportunityId,
    dealId,
  });

  if (!recipients.ok) {
    await recordOperationalEmailActivity({
      input,
      sourceEventId,
      kind: "email_failed",
      title: "Email Failed",
      summary: recipients.message,
      payload: {
        eventType: "document_request",
        deliveryStatus: "recipient_unresolved",
        failureCode: recipients.code,
        to: [],
        cc: [],
      },
    });
    return baseFailure({
      deliveryStatus: "recipient_unresolved",
      message: recipients.message,
      failureCode: recipients.code,
    });
  }

  const profile = await loadCustomersProfile();
  if (!profile?.active || profile.smtpProvider !== "smtp") {
    return baseFailure({
      deliveryStatus: "failed",
      to: recipients.to,
      cc: recipients.cc,
      message: "CUSTOMERS profile is inactive or SMTP is not configured.",
      failureCode: "PROFILE_NOT_READY",
    });
  }

  const host = profile.smtpHost?.trim() || null;
  const port = profile.smtpPort ?? null;
  const username = profile.smtpUsername?.trim() || null;
  const senderEmail = profile.senderEmail?.trim() || null;
  const replyToEmail =
    profile.replyToEmail?.trim() || profile.senderEmail?.trim() || null;
  const secret = resolveSmtpSecret("CUSTOMERS");

  if (!host || !port || !username || !senderEmail || !replyToEmail || !secret) {
    return baseFailure({
      deliveryStatus: "failed",
      to: recipients.to,
      cc: recipients.cc,
      message: "SMTP configuration or credential is incomplete.",
      failureCode: "SMTP_NOT_CONFIGURED",
    });
  }

  const subjectTemplate = input.testSubject?.trim()
    ? input.testSubject.trim()
    : DOCUMENT_REQUEST_EMAIL_SUBJECT.replace("{{Loan Product}}", input.loanProduct || "Loan");
  const subject = input.asReminder ? `Reminder: ${subjectTemplate}` : subjectTemplate;

  let textBody = buildDocumentRequestEmailBody({
    customerName: input.customerDisplayName || "Customer",
    loanProduct: input.loanProduct || "Loan",
    borrowerType: input.borrowerType || "N/A",
    constitution: input.constitution || "N/A",
    opportunityReference: input.opportunityNumber,
    uploadUrl: input.uploadUrl,
  });

  if (input.documentSummary?.trim()) {
    textBody = `${input.documentSummary.trim()}\n\n${textBody}`;
  }
  if (input.asReminder) {
    textBody = `Reminder — please upload pending documents.\n\n${textBody}`;
  }

  const send = await sendOperationalSmtpMessage({
    host,
    port,
    username,
    password: secret,
    fromEmail: senderEmail,
    fromName: profile.displayName?.trim() || "Rupee Catalyst Connect",
    replyToEmail,
    to: recipients.to,
    cc: recipients.cc,
    subject,
    textBody,
    ehloName: "catalyst-one-document-request",
  });

  if (!send.ok) {
    await recordOperationalEmailActivity({
      input,
      sourceEventId,
      kind: "email_failed",
      title: "Email Failed",
      summary: send.message,
      payload: {
        eventType: "document_request",
        deliveryStatus: "failed",
        senderProfileCode: "CUSTOMERS",
        senderEmail,
        replyToEmail,
        to: recipients.to,
        cc: recipients.cc,
        subject,
        smtpResponse: send.smtpResponse,
        failureReason: send.message,
      },
    });
    return {
      ok: false,
      deliveryStatus: "failed",
      eventType: "document_request",
      opportunityId: input.opportunityId,
      dealId,
      senderProfileCode: "CUSTOMERS",
      senderEmail,
      replyToEmail,
      to: recipients.to,
      cc: recipients.cc,
      subject,
      message: send.message,
      smtpResponse: send.smtpResponse,
      failureCode: "SMTP_SEND_FAILED",
      sourceEventId,
    };
  }

  await recordOperationalEmailActivity({
    input,
    sourceEventId,
    kind: "email_sent",
    title: "Email Sent",
    summary: [
      `Ref ${input.opportunityNumber}`,
      `TO ${recipients.to.join(", ")}`,
      recipients.cc.length ? `CC ${recipients.cc.join(", ")}` : null,
      send.smtpResponse,
    ]
      .filter(Boolean)
      .join(" · "),
    payload: {
      eventType: "document_request",
      deliveryStatus: "sent",
      senderProfileCode: "CUSTOMERS",
      senderEmail,
      replyToEmail,
      to: recipients.to,
      cc: recipients.cc,
      subject,
      smtpResponse: send.smtpResponse,
      source: "document_requests",
      kind: "email_sent",
    },
  });

  return {
    ok: true,
    deliveryStatus: "sent",
    eventType: "document_request",
    opportunityId: input.opportunityId,
    dealId,
    senderProfileCode: "CUSTOMERS",
    senderEmail,
    replyToEmail,
    to: recipients.to,
    cc: recipients.cc,
    subject,
    message: send.message,
    smtpResponse: send.smtpResponse,
    failureCode: null,
    sourceEventId,
  };
}

async function recordOperationalEmailActivity(args: {
  input: {
    opportunityId: string;
    dealId?: string | null;
    actorUserId: string;
    actorName: string;
  };
  sourceEventId: string;
  kind: "email_sent" | "email_failed";
  title: string;
  summary: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    await enterpriseActivityService.emit({
      eventKind: "communications",
      sourceSystem: "document_request",
      sourceEventId: args.sourceEventId,
      title: args.title,
      summary: args.summary,
      payload: {
        contextType: "opportunity",
        contextId: args.input.opportunityId,
        source: "document_requests",
        ...args.payload,
      },
      opportunityId: args.input.opportunityId,
      dealId: args.input.dealId?.trim() || null,
      actorUserId: args.input.actorUserId,
      actorName: args.input.actorName,
      occurredAt: new Date().toISOString(),
    });
  } catch {
    /* audit must not block response */
  }
}
