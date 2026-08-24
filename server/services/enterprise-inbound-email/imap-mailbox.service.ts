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

/**
 * Env-only IMAP config (legacy fallback). Prefer inboundEmailServerConfigService.resolveRuntimeImapConfig().
 */
export function resolveInboundImapConfigFromEnv(): InboundImapConfig | null {
  const host = process.env.INBOUND_EMAIL_IMAP_HOST?.trim();
  const user = process.env.INBOUND_EMAIL_IMAP_USER?.trim();
  const password = process.env.INBOUND_EMAIL_IMAP_PASSWORD?.trim();
  if (!host || !user || !password) return null;
  const port = Number(process.env.INBOUND_EMAIL_IMAP_PORT || "993");
  const mailbox = process.env.INBOUND_EMAIL_MAILBOX?.trim() || "INBOX";
  return { host, port: Number.isFinite(port) ? port : 993, user, password, mailbox };
}

/** @deprecated Use resolveInboundImapConfigFromEnv or DB-backed runtime resolver. */
export function resolveInboundImapConfig(): InboundImapConfig | null {
  return resolveInboundImapConfigFromEnv();
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

/**
 * Bounded Hostinger IMAP poll — keep under external cron HTTP budgets (~30s).
 * Probe path deliberately does not use these options.
 */
export const INBOUND_EMAIL_POLL_MESSAGE_LIMIT = 3;
/** TCP/TLS + auth must complete quickly. */
export const INBOUND_EMAIL_POLL_CONNECTION_TIMEOUT_MS = 8_000;
export const INBOUND_EMAIL_POLL_GREETING_TIMEOUT_MS = 8_000;
/** Stuck FETCH/SEARCH fails before cron-job.org's 30s client timeout. */
export const INBOUND_EMAIL_POLL_SOCKET_TIMEOUT_MS = 12_000;

export type FetchUnreadInboundEmailsOptions = {
  /** Absolute deadline (Date.now()); loop stops cleanly when reached. */
  deadlineAt?: number;
};

export type FetchUnreadInboundEmailsResult = {
  emails: ParsedInboundEmail[];
  /** True when the poll stopped before the message limit due to deadline or IMAP error. */
  stoppedEarly: boolean;
};

function isPastDeadline(deadlineAt: number | undefined): boolean {
  return typeof deadlineAt === "number" && Date.now() >= deadlineAt;
}

export async function fetchUnreadInboundEmails(
  config: InboundImapConfig,
  limit = INBOUND_EMAIL_POLL_MESSAGE_LIMIT,
  options?: FetchUnreadInboundEmailsOptions,
): Promise<FetchUnreadInboundEmailsResult> {
  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: INBOUND_EMAIL_POLL_CONNECTION_TIMEOUT_MS,
    greetingTimeout: INBOUND_EMAIL_POLL_GREETING_TIMEOUT_MS,
    socketTimeout: INBOUND_EMAIL_POLL_SOCKET_TIMEOUT_MS,
  });

  // Prevent imapflow ETIMEOUT from becoming process uncaughtException.
  let clientError: Error | null = null;
  client.on("error", (err: Error) => {
    clientError = err instanceof Error ? err : new Error(String(err));
  });

  const results: ParsedInboundEmail[] = [];
  const messageLimit = Math.max(1, Math.min(limit, INBOUND_EMAIL_POLL_MESSAGE_LIMIT));
  let stoppedEarly = false;

  try {
    if (isPastDeadline(options?.deadlineAt)) {
      return { emails: results, stoppedEarly: true };
    }

    await client.connect();
    if (clientError) throw clientError;
    if (isPastDeadline(options?.deadlineAt)) {
      return { emails: results, stoppedEarly: true };
    }

    const lock = await client.getMailboxLock(config.mailbox);
    try {
      if (clientError) throw clientError;

      // Newest-first: SEARCH UNSEEN, sort UIDs descending, then fetch individually.
      // Avoids oldest-first streaming that starves newer mail under the IMAP deadline.
      const unseen = await client.search({ seen: false }, { uid: true });
      if (clientError) throw clientError;
      const unseenUids = Array.isArray(unseen) ? unseen : [];
      const newestFirstUids = [...unseenUids].sort((a, b) => b - a);

      let count = 0;
      for (const uid of newestFirstUids) {
        if (clientError) throw clientError;
        if (isPastDeadline(options?.deadlineAt)) {
          stoppedEarly = true;
          break;
        }
        if (count >= messageLimit) break;

        const msg = await client.fetchOne(
          String(uid),
          { source: true, uid: true, internalDate: true },
          { uid: true },
        );
        if (clientError) throw clientError;
        if (!msg || !msg.source) continue;

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
          imapUid: msg.uid ? String(msg.uid) : String(uid),
          attachments,
        });

        await client.messageFlagsAdd(msg.uid ?? uid, ["\\Seen"], { uid: true });
        count += 1;
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    const surfaced = clientError ?? (err instanceof Error ? err : new Error(String(err)));
    // Prefer returning messages already safely parsed/marked when the session dies mid-poll.
    if (results.length > 0) {
      return { emails: results, stoppedEarly: true };
    }
    throw surfaced;
  } finally {
    await client.logout().catch(() => undefined);
  }

  if (clientError && results.length === 0) {
    throw clientError;
  }

  return { emails: results, stoppedEarly };
}

/**
 * Controlled IMAP connectivity probe — AUTH + open mailbox only.
 * Does not fetch or mutate messages. Never logs credentials.
 */
export async function probeInboundImapConnection(
  config: InboundImapConfig,
): Promise<{
  ok: boolean;
  tlsConnected: boolean;
  authVerified: boolean;
  mailboxOpened: boolean;
  message: string;
}> {
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
  });

  let tlsConnected = false;
  let authVerified = false;
  let mailboxOpened = false;

  try {
    await client.connect();
    tlsConnected = true;
    authVerified = true;
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      mailboxOpened = Boolean(client.mailbox);
    } finally {
      lock.release();
    }
    await client.logout().catch(() => undefined);
    return {
      ok: true,
      tlsConnected,
      authVerified,
      mailboxOpened,
      message: `IMAP connected to ${config.host}:${config.port} mailbox ${config.mailbox}`,
    };
  } catch (err) {
    await client.logout().catch(() => undefined);
    const raw = err instanceof Error ? err.message : "IMAP probe failed";
    // Never echo credentials if libraries include them in errors
    const message = raw.replace(/pass(?:word)?[=:].*/gi, "[redacted]");
    return {
      ok: false,
      tlsConnected,
      authVerified,
      mailboxOpened,
      message,
    };
  }
}

