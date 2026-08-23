/**
 * CO-C1-COMMUNICATION-002 — Universal inbound email ingestion orchestrator.
 */
import "server-only";

import { createHash } from "node:crypto";
import { ROUTES } from "@/constants/routes";
import { createUnclassifiedDocumentTypeRef } from "@/constants/document-intake";
import {
  INBOUND_EMAIL_SOURCE_SYSTEM,
} from "@/constants/enterprise-inbound-email";
import { matchInboundEmailTransaction } from "@/lib/enterprise-inbound-email/transaction-matcher";
import type { ParsedInboundEmail } from "@/types/enterprise-inbound-email";
import { enterpriseActivityService } from "@server/services/enterprise-activity/enterprise-activity.service";
import { buildInboundMatchContext } from "@server/services/enterprise-inbound-email/inbound-match-context.service";
import {
  fetchUnreadInboundEmails,
  INBOUND_EMAIL_POLL_MESSAGE_LIMIT,
} from "@server/services/enterprise-inbound-email/imap-mailbox.service";
import { inboundEmailServerConfigService } from "@server/services/enterprise-inbound-email/inbound-email-server-config.service";
import { enterpriseNotificationService } from "@server/services/enterprise-notification/enterprise-notification.service";
import { enterpriseTransactionDocumentService } from "@server/services/enterprise-transaction-documents/enterprise-transaction-document.service";
import { enterpriseInboundEmailRepository } from "@server/repositories/enterprise-inbound-email/enterprise-inbound-email.repository";
import { prisma } from "@server/lib/prisma";

function buildTransactionHref(args: {
  opportunityId: string;
  dealId: string | null;
}): string {
  if (args.dealId) return `/deals/${encodeURIComponent(args.dealId)}`;
  return `${ROUTES.OPPORTUNITY_WORKSPACE}?opportunityId=${encodeURIComponent(args.opportunityId)}`;
}

async function resolveOrganizationId(): Promise<string> {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org) throw new Error("No organization found");
  return org.id;
}

async function resolveRmUserId(args: {
  organizationId: string;
  opportunityId: string | null;
  dealId: string | null;
}): Promise<string | null> {
  if (args.dealId) {
    const deal = await prisma.enterpriseDeal.findFirst({
      where: { id: args.dealId, organizationId: args.organizationId, isDeleted: false },
      select: { relationshipManagerUserId: true, primaryOwnerUserId: true },
    });
    return deal?.relationshipManagerUserId ?? deal?.primaryOwnerUserId ?? null;
  }
  if (args.opportunityId) {
    const opp = await prisma.enterpriseOpportunity.findFirst({
      where: { id: args.opportunityId, organizationId: args.organizationId, isDeleted: false },
      select: { relationshipManagerUserId: true, primaryOwnerUserId: true },
    });
    return opp?.relationshipManagerUserId ?? opp?.primaryOwnerUserId ?? null;
  }
  return null;
}

async function ingestOneEmail(args: {
  organizationId: string;
  email: ParsedInboundEmail;
  sourceMailbox: string;
  internalDomains: string[];
}): Promise<{ status: string; messageId: string }> {
  const existing = await enterpriseInboundEmailRepository.findByMessageId(
    args.organizationId,
    args.email.messageId,
  );
  if (existing) {
    return { status: "duplicate_skipped", messageId: args.email.messageId };
  }

  const matchContext = await buildInboundMatchContext({
    organizationId: args.organizationId,
    fromEmail: args.email.fromEmail,
    subject: args.email.subject,
    textBody: args.email.textBody,
    inReplyTo: args.email.inReplyTo,
    referencesHeader: args.email.referencesHeader,
    internalDomains: args.internalDomains,
  });
  const match = matchInboundEmailTransaction(matchContext);

  const ledger = await enterpriseInboundEmailRepository.create({
    organizationId: args.organizationId,
    messageId: args.email.messageId,
    inReplyTo: args.email.inReplyTo,
    referencesHeader: args.email.referencesHeader,
    fromEmail: args.email.fromEmail,
    fromName: args.email.fromName,
    toEmailsJson: args.email.toEmails,
    ccEmailsJson: args.email.ccEmails,
    replyToEmail: args.email.replyToEmail,
    subject: args.email.subject,
    textBody: args.email.textBody,
    receivedAt: args.email.receivedAt,
    senderRole: match.senderRole,
    matchStatus:
      match.status === "matched"
        ? "matched"
        : match.status === "processed"
          ? "processed"
          : match.status,
    matchReason: match.reason,
    opportunityId: match.opportunityId,
    dealId: match.dealId,
    contactId: match.contactId,
    outboundSourceEventId: match.outboundSourceEventId,
    attachmentCount: args.email.attachments.length,
    sourceMailbox: args.sourceMailbox,
    imapUid: args.email.imapUid,
  });

  if (match.status !== "matched" || !match.opportunityId) {
    return { status: ledger.matchStatus, messageId: args.email.messageId };
  }

  return processMatchedInbound({
    organizationId: args.organizationId,
    ledgerId: ledger.id,
    email: args.email,
    match: {
      opportunityId: match.opportunityId,
      dealId: match.dealId,
      contactId: match.contactId,
      senderRole: match.senderRole,
      reason: match.reason,
    },
  });
}

async function processMatchedInbound(args: {
  organizationId: string;
  ledgerId: string;
  email: ParsedInboundEmail;
  match: {
    opportunityId: string;
    dealId: string | null;
    contactId: string | null;
    senderRole: string;
    reason: string;
  };
}): Promise<{ status: string; messageId: string }> {
  const { match, email, ledgerId, organizationId } = args;

  const opp = await prisma.enterpriseOpportunity.findFirst({
    where: { id: match.opportunityId, organizationId, isDeleted: false },
    select: {
      id: true,
      opportunityNumber: true,
      primaryContactName: true,
    },
  });
  if (!opp) {
    await enterpriseInboundEmailRepository.updateStatus(ledgerId, {
      matchStatus: "failed",
      failureReason: "Matched opportunity no longer exists",
    });
    return { status: "failed", messageId: email.messageId };
  }

  const attachmentNames = email.attachments.map((a) => a.filename);
  const summaryParts = [
    email.fromEmail,
    email.subject,
    email.attachments.length ? `${email.attachments.length} attachment(s)` : null,
  ].filter(Boolean);

  const earSourceEventId = email.messageId.replace(/^<|>$/g, "");

  await enterpriseActivityService.emitBestEffort({
    eventKind: "communications",
    sourceSystem: INBOUND_EMAIL_SOURCE_SYSTEM,
    sourceEventId: earSourceEventId,
    title:
      match.senderRole === "customer"
        ? "Customer replied"
        : match.senderRole === "lender"
          ? "Lender email received"
          : match.senderRole === "wealth_partner"
            ? "Wealth Partner email received"
            : "Email received",
    summary: summaryParts.join(" · "),
    payload: {
      kind: "email_received",
      eventType: "email_received",
      messageId: email.messageId,
      inReplyTo: email.inReplyTo,
      references: email.referencesHeader,
      fromEmail: email.fromEmail,
      to: email.toEmails,
      cc: email.ccEmails,
      subject: email.subject,
      attachmentCount: email.attachments.length,
      attachmentNames,
      senderRole: match.senderRole,
      matchReason: match.reason,
      deliveryStatus: "received",
    },
    opportunityId: match.opportunityId,
    dealId: match.dealId,
    contactId: match.contactId,
    actorName: email.fromName || email.fromEmail,
    occurredAt: email.receivedAt.toISOString(),
  });

  const rmUserId = await resolveRmUserId({
    organizationId,
    opportunityId: match.opportunityId,
    dealId: match.dealId,
  });

  const eventType =
    email.attachments.length > 0
      ? "CUSTOMER_EMAIL_ATTACHMENT_RECEIVED"
      : "CUSTOMER_EMAIL_RECEIVED";

  await enterpriseNotificationService.fanOutBestEffort({
    organizationId,
    eventType,
    sourceEventId: earSourceEventId,
    sourceSystem: INBOUND_EMAIL_SOURCE_SYSTEM,
    title:
      email.attachments.length > 0
        ? "Customer attached documents"
        : "Customer replied",
    body: email.subject,
    description: opp.primaryContactName ?? email.fromName ?? email.fromEmail,
    opportunityId: match.opportunityId,
    dealId: match.dealId,
    contactId: match.contactId,
    customerName: opp.primaryContactName,
    href: buildTransactionHref({
      opportunityId: match.opportunityId,
      dealId: match.dealId,
    }),
    explicitRecipientUserIds: rmUserId ? [rmUserId] : undefined,
    occurredAt: email.receivedAt.toISOString(),
  });

  for (const attachment of email.attachments) {
    const existingAtt = await enterpriseInboundEmailRepository.findAttachmentByHash(
      organizationId,
      ledgerId,
      attachment.contentHash,
    );
    if (existingAtt?.documentId) continue;

    const clientRecordId = `inbound-email:${earSourceEventId}:${attachment.contentHash.slice(0, 16)}`;
    const doc = await enterpriseTransactionDocumentService.upsertForOrganization(
      organizationId,
      {
        opportunityId: match.opportunityId,
        opportunityNumber: opp.opportunityNumber,
        clientRecordId,
        loanFileId: match.dealId,
        contactId: match.contactId,
        documentScope: "shared",
        typeRef: createUnclassifiedDocumentTypeRef(clientRecordId),
        categoryLabel: "Inbound Email Attachment",
        originalFilename: attachment.filename,
        displayName: attachment.filename,
        mimeType: attachment.mimeType,
        fileSizeBytes: attachment.sizeBytes,
        uploadSource: "email",
        uploadedBy: `inbound:${email.fromEmail}`,
        contentBase64: attachment.content.toString("base64"),
      },
    );

    await enterpriseInboundEmailRepository.createAttachment({
      organizationId,
      inboundEmailId: ledgerId,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      contentHash: attachment.contentHash,
      documentId: doc.id,
    });
  }

  await enterpriseInboundEmailRepository.updateStatus(ledgerId, {
    matchStatus: "processed",
    processedAt: new Date(),
  });

  return { status: "processed", messageId: email.messageId };
}

export const inboundEmailIngestionService = {
  async isEnabled(): Promise<boolean> {
    const runtime = await inboundEmailServerConfigService.resolveRuntimeImapConfig();
    return runtime.enabled;
  },

  async pollAndIngest(): Promise<{
    enabled: boolean;
    configured: boolean;
    fetched: number;
    results: Array<{ status: string; messageId: string }>;
    /** True when the cooperative cron budget stopped IMAP work early (additive). */
    stoppedEarly?: boolean;
  }> {
    // cron-job.org max HTTP wait is 30s — bound IMAP under that; finish ingest of the small batch.
    const IMAP_BUDGET_MS = 16_000;
    const startedAt = Date.now();
    const imapDeadlineAt = startedAt + IMAP_BUDGET_MS;

    const runtime = await inboundEmailServerConfigService.resolveRuntimeImapConfig();
    if (!runtime.enabled) {
      return { enabled: false, configured: false, fetched: 0, results: [] };
    }
    if (!runtime.imap) {
      return { enabled: true, configured: false, fetched: 0, results: [] };
    }

    const organizationId = await resolveOrganizationId();
    const { emails, stoppedEarly: imapStoppedEarly } = await fetchUnreadInboundEmails(
      runtime.imap,
      INBOUND_EMAIL_POLL_MESSAGE_LIMIT,
      { deadlineAt: imapDeadlineAt },
    );
    const results: Array<{ status: string; messageId: string }> = [];

    // Always ingest every message already fetched/marked \\Seen in this tick (max 3).
    // Do not abandon mid-batch — that would leave Seen messages without ledger rows.
    for (const email of emails) {
      try {
        results.push(
          await ingestOneEmail({
            organizationId,
            email,
            sourceMailbox: runtime.imap.mailbox,
            internalDomains: runtime.internalDomains,
          }),
        );
      } catch (err) {
        const fallbackId =
          email.messageId ||
          `<failed.${createHash("sha256").update(email.subject).digest("hex").slice(0, 16)}@local>`;
        results.push({
          status: "failed",
          messageId: fallbackId,
        });
        await enterpriseInboundEmailRepository.create({
          organizationId,
          messageId: fallbackId,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          toEmailsJson: email.toEmails,
          ccEmailsJson: email.ccEmails,
          subject: email.subject,
          textBody: email.textBody,
          receivedAt: email.receivedAt,
          matchStatus: "failed",
          matchReason: "ingestion_error",
          failureReason: err instanceof Error ? err.message : "Ingestion failed",
          attachmentCount: email.attachments.length,
          sourceMailbox: runtime.imap.mailbox,
          imapUid: email.imapUid,
        }).catch(() => undefined);
      }
    }

    const stoppedEarly = imapStoppedEarly;

    return {
      enabled: true,
      configured: true,
      fetched: emails.length,
      results,
      ...(stoppedEarly ? { stoppedEarly: true } : {}),
    };
  },

  async manuallyMatchEmail(args: {
    organizationId: string;
    inboundEmailId: string;
    opportunityId: string;
    dealId?: string | null;
    actorUserId: string;
    actorName: string;
  }) {
    const row = await prisma.enterpriseInboundEmailMessage.findFirst({
      where: { id: args.inboundEmailId, organizationId: args.organizationId },
    });
    if (!row) throw Object.assign(new Error("Inbound email not found"), { statusCode: 404 });

    await enterpriseInboundEmailRepository.updateStatus(row.id, {
      matchStatus: "matched",
      matchReason: "manual_admin_match",
      opportunityId: args.opportunityId,
      dealId: args.dealId ?? null,
    });

    const parsed: ParsedInboundEmail = {
      messageId: row.messageId,
      inReplyTo: row.inReplyTo,
      referencesHeader: row.referencesHeader,
      fromEmail: row.fromEmail,
      fromName: row.fromName,
      toEmails: Array.isArray(row.toEmailsJson) ? (row.toEmailsJson as string[]) : [],
      ccEmails: Array.isArray(row.ccEmailsJson) ? (row.ccEmailsJson as string[]) : [],
      replyToEmail: row.replyToEmail,
      subject: row.subject,
      textBody: row.textBody,
      receivedAt: row.receivedAt,
      imapUid: row.imapUid,
      attachments: [],
    };

    if (row.matchStatus === "processed") {
      return { status: "already_processed", messageId: row.messageId };
    }

    return processMatchedInbound({
      organizationId: args.organizationId,
      ledgerId: row.id,
      email: parsed,
      match: {
        opportunityId: args.opportunityId,
        dealId: args.dealId ?? null,
        contactId: row.contactId,
        senderRole: row.senderRole ?? "customer",
        reason: "manual_admin_match",
      },
    });
  },
};
