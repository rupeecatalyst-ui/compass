/**
 * CO-C1-COMMUNICATION-002 — Inbound operational email types.
 */

export type InboundEmailMatchStatus =
  | "received"
  | "matched"
  | "unmatched"
  | "needs_review"
  | "processed"
  | "failed";

export type InboundEmailSenderRole =
  | "customer"
  | "lender"
  | "wealth_partner"
  | "internal"
  | "unknown";

export type ParsedInboundEmail = {
  messageId: string;
  inReplyTo: string | null;
  referencesHeader: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  replyToEmail: string | null;
  subject: string;
  textBody: string | null;
  receivedAt: Date;
  imapUid: string | null;
  attachments: ParsedInboundAttachment[];
};

export type ParsedInboundAttachment = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
  contentHash: string;
};

export type InboundTransactionMatch = {
  status: "matched" | "needs_review" | "unmatched" | "processed";
  reason: string;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  outboundSourceEventId: string | null;
  senderRole: InboundEmailSenderRole;
};
