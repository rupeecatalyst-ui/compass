/**
 * CO-C1-COMMUNICATION-002 — Inbound operational email constants.
 */

export const INBOUND_EMAIL_SOURCE_SYSTEM = "inbound_email" as const;

export const INBOUND_EMAIL_MATCH_STATUSES = [
  "received",
  "matched",
  "unmatched",
  "needs_review",
  "processed",
  "failed",
] as const;

export const OPP_REFERENCE_RE = /\bOPP-\d{4}-\d{6}\b/gi;
export const DEAL_REFERENCE_RE = /\bDEAL-\d{4}-\d{6}\b/gi;
export const C1_MESSAGE_ID_RE = /<c1\.[^@\s>]+@rupeecatalyst\.com>/gi;

export const INBOUND_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;

export const INBOUND_ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
] as const;

export function isInboundEmailEnabled(): boolean {
  const raw = process.env.INBOUND_EMAIL_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/** Parse comma-separated internal domains (DB or env). */
export function parseInternalEmailDomains(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/** Env-only internal domains (fallback when no DB config). */
export function resolveInternalEmailDomainsFromEnv(): string[] {
  const raw =
    process.env.INBOUND_EMAIL_INTERNAL_DOMAINS?.trim() || "rupeecatalyst.com";
  return parseInternalEmailDomains(raw);
}

/** @deprecated Prefer resolveInternalEmailDomainsFromEnv or DB-backed runtime config. */
export function resolveInternalEmailDomains(): string[] {
  return resolveInternalEmailDomainsFromEnv();
}

export function normalizeMessageId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  let id = value.trim();
  if (!id.startsWith("<")) id = `<${id}`;
  if (!id.endsWith(">")) id = `${id}>`;
  return id.toLowerCase();
}

export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAllowedInboundAttachmentMime(mimeType: string): boolean {
  const m = mimeType.trim().toLowerCase();
  if (!m) return false;
  return INBOUND_ALLOWED_MIME_PREFIXES.some((prefix) => m.startsWith(prefix));
}
