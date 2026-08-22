/**
 * CO-C1-COMMUNICATION-001 — Unified server-side operational transaction email dispatch.
 * RecipientRouter → ECC CUSTOMERS → Hostinger SMTP → EAR + ENE.
 */

import { isOperationalSmtpDeliveryEnabled } from "@/constants/enterprise-communication-center/operational-delivery";
import {
  buildDocumentRequestEmailBody,
  DOCUMENT_REQUEST_EMAIL_SUBJECT,
} from "@/constants/document-requests";
import { ROUTES } from "@/constants/routes";
import { resolveSmtpSecret } from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import type {
  CustomerFacingRecipientEvent,
  RecipientRouterResult,
  TransactionPrimaryToRole,
} from "@/lib/enterprise-communication-center/recipient-router";
import type { EnterpriseCommunicationProfileRecord } from "@/types/enterprise-communication-center";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { enterpriseCommunicationCenterService } from "@server/services/enterprise-communication-center/ecc.service";
import { loadAndResolveTransactionOperationalRecipients } from "@server/services/enterprise-communication-center/recipient-router.service";
import { sendOperationalSmtpMessage } from "@server/services/enterprise-communication-center/smtp-transport.service";
import { enterpriseNotificationService } from "@server/services/enterprise-notification/enterprise-notification.service";

export type OperationalEmailDeliveryStatus =
  | "sent"
  | "failed"
  | "disabled"
  | "recipient_unresolved";

export type OperationalEmailPreviewResult = {
  operationalDeliveryEnabled: boolean;
  enceExternalDeliveryEnabled: false;
  eventType: CustomerFacingRecipientEvent;
  primaryToRole: TransactionPrimaryToRole;
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
  deliveryStatus: OperationalEmailDeliveryStatus;
  eventType: CustomerFacingRecipientEvent;
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
  messageId: string | null;
};

export type DispatchOperationalTransactionEmailInput = {
  organizationId: string;
  eventType: CustomerFacingRecipientEvent;
  opportunityId: string;
  dealId?: string | null;
  actorUserId: string;
  actorName: string;
  subject: string;
  textBody: string;
  primaryToRole?: TransactionPrimaryToRole;
  internalUserId?: string | null;
  customerDisplayName?: string | null;
  opportunityReference?: string | null;
  sourceSystem?: string;
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

function buildTransactionHref(args: {
  opportunityId: string;
  dealId: string | null;
}): string {
  if (args.dealId) {
    return `/deals/${encodeURIComponent(args.dealId)}`;
  }
  return `${ROUTES.OPPORTUNITY_WORKSPACE}?opportunityId=${encodeURIComponent(args.opportunityId)}`;
}

function buildMessageId(sourceEventId: string): string {
  const token = sourceEventId.replace(/[^a-zA-Z0-9.-]/g, "-").slice(0, 48);
  return `<c1.${token}.${Date.now()}@rupeecatalyst.com>`;
}

export async function previewOperationalTransactionEmail(input: {
  organizationId: string;
  eventType: CustomerFacingRecipientEvent;
  opportunityId: string;
  dealId?: string | null;
  primaryToRole?: TransactionPrimaryToRole;
  internalUserId?: string | null;
}): Promise<OperationalEmailPreviewResult> {
  const primaryToRole = input.primaryToRole ?? "customer";
  const recipientResolution = await loadAndResolveTransactionOperationalRecipients({
    organizationId: input.organizationId,
    eventType: input.eventType,
    opportunityId: input.opportunityId,
    dealId: input.dealId ?? null,
    primaryToRole,
    internalUserId: input.internalUserId ?? null,
  });

  const profile = await loadCustomersProfile();

  return {
    operationalDeliveryEnabled: isOperationalSmtpDeliveryEnabled(),
    enceExternalDeliveryEnabled: false,
    eventType: input.eventType,
    primaryToRole,
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

export async function dispatchOperationalTransactionEmail(
  input: DispatchOperationalTransactionEmailInput,
): Promise<OperationalEmailDispatchResult> {
  const sourceEventId = `txn-email:${input.eventType}:${input.opportunityId}:${Date.now()}`;
  const dealId = input.dealId?.trim() || null;
  const primaryToRole = input.primaryToRole ?? "customer";
  const sourceSystem = input.sourceSystem?.trim() || "operational_email";
  const subject = input.subject.trim();
  const textBody = input.textBody.trim();

  const baseFailure = (
    partial: Partial<OperationalEmailDispatchResult> &
      Pick<OperationalEmailDispatchResult, "deliveryStatus" | "message" | "failureCode">,
  ): OperationalEmailDispatchResult => ({
    ok: false,
    eventType: input.eventType,
    opportunityId: input.opportunityId,
    dealId,
    senderProfileCode: "CUSTOMERS",
    senderEmail: partial.senderEmail ?? null,
    replyToEmail: partial.replyToEmail ?? null,
    to: partial.to ?? [],
    cc: partial.cc ?? [],
    subject: partial.subject ?? subject,
    smtpResponse: partial.smtpResponse ?? null,
    sourceEventId,
    messageId: null,
    ...partial,
  });

  if (!subject || !textBody) {
    return baseFailure({
      deliveryStatus: "failed",
      message: "Subject and message body are required.",
      failureCode: "INVALID_PAYLOAD",
    });
  }

  if (!isOperationalSmtpDeliveryEnabled()) {
    await recordOperationalEmailActivity({
      input,
      sourceEventId,
      dealId,
      kind: "email_failed",
      title: "Email Failed",
      summary: "Operational SMTP delivery is disabled.",
      sourceSystem,
      payload: {
        eventType: input.eventType,
        deliveryStatus: "disabled",
        failureCode: "OPERATIONAL_DELIVERY_DISABLED",
        primaryToRole,
      },
    });
    return baseFailure({
      deliveryStatus: "disabled",
      message:
        "Operational SMTP delivery is disabled (ECC_OPERATIONAL_SMTP_DELIVERY_ENABLED).",
      failureCode: "OPERATIONAL_DELIVERY_DISABLED",
    });
  }

  const recipients = await loadAndResolveTransactionOperationalRecipients({
    organizationId: input.organizationId,
    eventType: input.eventType,
    opportunityId: input.opportunityId,
    dealId,
    primaryToRole,
    internalUserId: input.internalUserId ?? null,
  });

  if (!recipients.ok) {
    await recordOperationalEmailActivity({
      input,
      sourceEventId,
      dealId,
      kind: "email_failed",
      title: "Email Failed",
      summary: recipients.message,
      sourceSystem,
      payload: {
        eventType: input.eventType,
        deliveryStatus: "recipient_unresolved",
        failureCode: recipients.code,
        primaryToRole,
        to: [],
        cc: [],
      },
    });
    await fanOutTransactionEmailNotification({
      input,
      sourceEventId,
      dealId,
      eventType: "TRANSACTION_EMAIL_FAILED",
      title: "Transaction email failed",
      body: recipients.message,
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

  const messageId = buildMessageId(sourceEventId);

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
    messageId,
    ehloName: "catalyst-one-transaction-email",
  });

  if (!send.ok) {
    await recordOperationalEmailActivity({
      input,
      sourceEventId,
      dealId,
      kind: "email_failed",
      title: "Email Failed",
      summary: send.message,
      sourceSystem,
      payload: {
        eventType: input.eventType,
        deliveryStatus: "failed",
        senderProfileCode: "CUSTOMERS",
        senderEmail,
        replyToEmail,
        to: recipients.to,
        cc: recipients.cc,
        subject,
        smtpResponse: send.smtpResponse,
        failureReason: send.message,
        primaryToRole,
        messageId,
      },
    });
    await fanOutTransactionEmailNotification({
      input,
      sourceEventId,
      dealId,
      eventType: "TRANSACTION_EMAIL_FAILED",
      title: "Transaction email failed",
      body: send.message,
    });
    return {
      ok: false,
      deliveryStatus: "failed",
      eventType: input.eventType,
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
      messageId,
    };
  }

  const activitySummary = [
    input.opportunityReference ? `Ref ${input.opportunityReference}` : null,
    input.customerDisplayName ? input.customerDisplayName : null,
    `TO ${recipients.to.join(", ")}`,
    recipients.cc.length ? `CC ${recipients.cc.join(", ")}` : null,
    send.smtpResponse,
  ]
    .filter(Boolean)
    .join(" · ");

  await recordOperationalEmailActivity({
    input,
    sourceEventId,
    dealId,
    kind: "email_sent",
    title: "Email Sent",
    summary: activitySummary,
    sourceSystem,
    payload: {
      eventType: input.eventType,
      deliveryStatus: "sent",
      senderProfileCode: "CUSTOMERS",
      senderEmail,
      replyToEmail,
      to: recipients.to,
      cc: recipients.cc,
      subject,
      smtpResponse: send.smtpResponse,
      primaryToRole,
      messageId,
      kind: "email_sent",
    },
  });

  await fanOutTransactionEmailNotification({
    input,
    sourceEventId,
    dealId,
    eventType: "TRANSACTION_EMAIL_SENT",
    title: "Transaction email sent",
    body: subject,
  });

  return {
    ok: true,
    deliveryStatus: "sent",
    eventType: input.eventType,
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
    messageId,
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

  return dispatchOperationalTransactionEmail({
    organizationId: input.organizationId,
    eventType: "document_request",
    opportunityId: input.opportunityId,
    dealId: input.dealId ?? null,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    subject,
    textBody,
    primaryToRole: "customer",
    customerDisplayName: input.customerDisplayName,
    opportunityReference: input.opportunityNumber,
    sourceSystem: "document_request",
  });
}

export async function previewDocumentRequestOperationalEmail(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
}): Promise<OperationalEmailPreviewResult> {
  return previewOperationalTransactionEmail({
    organizationId: input.organizationId,
    eventType: "document_request",
    opportunityId: input.opportunityId,
    dealId: input.dealId ?? null,
    primaryToRole: "customer",
  });
}

async function recordOperationalEmailActivity(args: {
  input: Pick<
    DispatchOperationalTransactionEmailInput,
    "opportunityId" | "dealId" | "actorUserId" | "actorName" | "eventType"
  >;
  sourceEventId: string;
  dealId: string | null;
  kind: "email_sent" | "email_failed";
  title: string;
  summary: string;
  sourceSystem: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    await enterpriseActivityService.emit({
      eventKind: "communications",
      sourceSystem: args.sourceSystem,
      sourceEventId: args.sourceEventId,
      title: args.title,
      summary: args.summary,
      payload: {
        contextType: args.dealId ? "deal" : "opportunity",
        contextId: args.dealId ?? args.input.opportunityId,
        opportunityId: args.input.opportunityId,
        dealId: args.dealId,
        ...args.payload,
      },
      opportunityId: args.input.opportunityId,
      dealId: args.dealId,
      actorUserId: args.input.actorUserId,
      actorName: args.input.actorName,
      occurredAt: new Date().toISOString(),
    });
  } catch {
    /* audit must not block response */
  }
}

async function fanOutTransactionEmailNotification(args: {
  input: Pick<
    DispatchOperationalTransactionEmailInput,
    "organizationId" | "opportunityId" | "actorUserId" | "actorName" | "customerDisplayName"
  >;
  sourceEventId: string;
  dealId: string | null;
  eventType: "TRANSACTION_EMAIL_SENT" | "TRANSACTION_EMAIL_FAILED";
  title: string;
  body: string;
}): Promise<void> {
  try {
    await enterpriseNotificationService.fanOutBestEffort({
      organizationId: args.input.organizationId,
      eventType: args.eventType,
      sourceEventId: args.sourceEventId,
      sourceSystem: "operational_email",
      title: args.title,
      body: args.body,
      description: args.input.customerDisplayName ?? null,
      actorUserId: args.input.actorUserId,
      actorName: args.input.actorName,
      opportunityId: args.input.opportunityId,
      dealId: args.dealId,
      customerName: args.input.customerDisplayName ?? null,
      href: buildTransactionHref({
        opportunityId: args.input.opportunityId,
        dealId: args.dealId,
      }),
    });
  } catch {
    /* notifications must not block send */
  }
}
