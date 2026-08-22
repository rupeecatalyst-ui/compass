/**
 * CO-C1-COMMUNICATION-002 — Inbound email durable ledger repository.
 */
import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@server/lib/prisma";

export type InboundEmailCreateInput = {
  organizationId: string;
  messageId: string;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
  fromEmail: string;
  fromName?: string | null;
  toEmailsJson: Prisma.InputJsonValue;
  ccEmailsJson?: Prisma.InputJsonValue;
  replyToEmail?: string | null;
  subject: string;
  textBody?: string | null;
  receivedAt: Date;
  senderRole?: string | null;
  matchStatus: string;
  matchReason?: string | null;
  opportunityId?: string | null;
  dealId?: string | null;
  contactId?: string | null;
  outboundSourceEventId?: string | null;
  attachmentCount?: number;
  processedAt?: Date | null;
  failureReason?: string | null;
  sourceMailbox?: string | null;
  imapUid?: string | null;
};

export const enterpriseInboundEmailRepository = {
  async findByMessageId(organizationId: string, messageId: string) {
    return prisma.enterpriseInboundEmailMessage.findUnique({
      where: {
        organizationId_messageId: { organizationId, messageId },
      },
    });
  },

  async create(input: InboundEmailCreateInput) {
    return prisma.enterpriseInboundEmailMessage.create({
      data: input,
    });
  },

  async updateStatus(
    id: string,
    data: Partial<
      Pick<
        InboundEmailCreateInput,
        | "matchStatus"
        | "matchReason"
        | "opportunityId"
        | "dealId"
        | "contactId"
        | "processedAt"
        | "failureReason"
        | "outboundSourceEventId"
      >
    >,
  ) {
    return prisma.enterpriseInboundEmailMessage.update({
      where: { id },
      data,
    });
  },

  async listReviewQueue(args: {
    organizationId: string;
    statuses?: string[];
    limit?: number;
  }) {
    return prisma.enterpriseInboundEmailMessage.findMany({
      where: {
        organizationId: args.organizationId,
        matchStatus: { in: args.statuses ?? ["unmatched", "needs_review"] },
      },
      orderBy: { receivedAt: "desc" },
      take: args.limit ?? 50,
      include: { attachments: true },
    });
  },

  async createAttachment(input: {
    organizationId: string;
    inboundEmailId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentHash: string;
    documentId?: string | null;
  }) {
    return prisma.enterpriseInboundEmailAttachment.create({ data: input });
  },

  async findAttachmentByHash(
    organizationId: string,
    inboundEmailId: string,
    contentHash: string,
  ) {
    return prisma.enterpriseInboundEmailAttachment.findUnique({
      where: {
        organizationId_inboundEmailId_contentHash: {
          organizationId,
          inboundEmailId,
          contentHash,
        },
      },
    });
  },
};
