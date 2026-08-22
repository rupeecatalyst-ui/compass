/**
 * CO-C1-COMMUNICATION-002 — Hostinger IMAP mailbox polling (server-only).
 */
import "server-only";

import { createHash } from "node:crypto";
import {
  INBOUND_ATTACHMENT_MAX_BYTES,
  isAllowedInboundAttachmentMime,
  normalizeMessageId,
  stripHtmlToPlainText,
} from "@/constants/enterprise-inbound-email";
import type { ParsedInboundAttachment, ParsedInboundEmail } from "@/types/enterprise-inbound-email";

export type InboundImapConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  mailbox: string;
};

export function resolveInboundImapConfig(): InboundImapConfig | null {
  const host = process.env.INBOUND_EMAIL_IMAP_HOST?.trim();
  const user = process.env.INBOUND_EMAIL_IMAP_USER?.trim();
  const password = process.env.INBOUND_EMAIL_IMAP_PASSWORD?.trim();
  if (!host || !user || !password) return null;
  const port = Number(process.env.INBOUND_EMAIL_IMAP_PORT || "993");
  const mailbox = process.env.INBOUND_EMAIL_MAILBOX?.trim() || "INBOX";
  return { host, port: Number.isFinite(port) ? port : 993, user, password, mailbox };
}

function hashBuffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function normalizeReferencesHeader(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return value.filter(Boolean).join(" ").trim() || null;
  return null;
}

function extractAddressEmails(value: unknown): string[] {
  const entries = Array.isArray(value)
    ? value.flatMap((item) => ("value" in item && Array.isArray(item.value) ? item.value : [item]))
    : value && typeof value === "object" && "value" in value && Array.isArray(value.value)
      ? value.value
      : [];
  return entries
    .map((entry) =>
      typeof entry === "object" && entry && "address" in entry
        ? String(entry.address || "")
            .trim()
            .toLowerCase()
        : "",
    )
    .filter(Boolean);
}

function resolveReceivedAt(parsedDate: unknown, fallback: unknown): Date {
  if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) return parsedDate;
  if (fallback instanceof Date && !Number.isNaN(fallback.getTime())) return fallback;
  return new Date();
}

export async function fetchUnreadInboundEmails(
  config: InboundImapConfig,
  limit = 25,
): Promise<ParsedInboundEmail[]> {
  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });

  const results: ParsedInboundEmail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      const messages = client.fetch(
        { seen: false },
        { source: true, uid: true, internalDate: true },
      );

      let count = 0;
      for await (const msg of messages) {
        if (count >= limit) break;
        if (!msg.source) continue;

        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.value?.[0];
        const fromEmail = from?.address?.trim().toLowerCase();
        if (!fromEmail) continue;

        const messageId =
          normalizeMessageId(parsed.messageId) ??
          `<generated.${hashBuffer(msg.source).slice(0, 32)}@catalyst-one.local>`;

        const attachments: ParsedInboundAttachment[] = [];
        for (const att of parsed.attachments ?? []) {
          const content = att.content;
          if (!content?.length) continue;
          if (content.length > INBOUND_ATTACHMENT_MAX_BYTES) continue;
          const mimeType = (att.contentType || "application/octet-stream").trim();
          if (!isAllowedInboundAttachmentMime(mimeType)) continue;
          attachments.push({
            filename: att.filename || "attachment.bin",
            mimeType,
            sizeBytes: content.length,
            content: Buffer.from(content),
            contentHash: hashBuffer(Buffer.from(content)),
          });
        }

        results.push({
          messageId,
          inReplyTo: normalizeMessageId(
            typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : null,
          ),
          referencesHeader: normalizeReferencesHeader(parsed.references),
          fromEmail,
          fromName: from?.name?.trim() || null,
          toEmails: extractAddressEmails(parsed.to),
          ccEmails: extractAddressEmails(parsed.cc),
          replyToEmail: extractAddressEmails(parsed.replyTo)[0] ?? null,
          subject:
            (typeof parsed.subject === "string" ? parsed.subject.trim() : "") || "(No subject)",
          textBody:
            (typeof parsed.text === "string" ? parsed.text.trim() : "") ||
            (parsed.html ? stripHtmlToPlainText(String(parsed.html)) : null),
          receivedAt: resolveReceivedAt(parsed.date, msg.internalDate),
          imapUid: msg.uid ? String(msg.uid) : null,
          attachments,
        });

        await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
        count += 1;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }

  return results;
}
