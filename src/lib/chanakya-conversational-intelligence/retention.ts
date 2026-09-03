/**
 * CO-C1-CHANAKYA-CONVERSATIONAL-INTELLIGENCE-009 / CO-C1-CHANAKYA-DURABLE-HISTORY-009A
 * Four-day rolling unsaved chat retention. Never mutates Catalyst One business records.
 */

import { CHANAKYA_CHAT_RETENTION_MS } from "@/constants/chanakya-conversational-intelligence";

export function chanakyaChatExpiryFrom(now = Date.now()): Date {
  return new Date(now + CHANAKYA_CHAT_RETENTION_MS);
}

export function isChanakyaChatSessionExpired(
  session: { expiresAt?: string | null; updatedAt?: string; createdAt?: string },
  now = Date.now(),
): boolean {
  if (session.expiresAt) {
    const expires = Date.parse(session.expiresAt);
    if (Number.isFinite(expires)) return expires <= now;
  }
  const updated = Date.parse(session.updatedAt || session.createdAt || "");
  if (!Number.isFinite(updated)) return true;
  return now - updated > CHANAKYA_CHAT_RETENTION_MS;
}
