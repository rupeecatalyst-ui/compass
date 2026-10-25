/**
 * Live Marketing test_send allowlist.
 * Env list ∩ frozen Product Owner addresses. Campaign audiences never use this.
 */

import {
  MARKETING_SMTP_BLOCK,
  MARKETING_TEST_RECIPIENT_ALLOWLIST_ENV,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import { MARKETING_CONTROLLED_LIVE_TEST_RECIPIENTS as FROZEN_TEST_RECIPIENTS } from "@/constants/enterprise-marketing-engine/controlled-live-test-recipients";

const FROZEN = new Set(
  FROZEN_TEST_RECIPIENTS.map((email) => email.trim().toLowerCase()),
);

function throwAllowlist(code: string): never {
  throw Object.assign(new Error(code), { statusCode: 403, code });
}

export function parseMarketingTestRecipientAllowlist(raw?: string): string[] {
  const source = raw ?? process.env[MARKETING_TEST_RECIPIENT_ALLOWLIST_ENV] ?? "";
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of source.split(/[,\n;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email) continue;
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

/** Env entries that are also on the frozen three-address list. */
export function resolveMarketingLiveTestAllowlist(raw?: string): string[] {
  return parseMarketingTestRecipientAllowlist(raw).filter((email) => FROZEN.has(email));
}

export function isMarketingLiveTestRecipientAllowlisted(email: string, raw?: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return resolveMarketingLiveTestAllowlist(raw).includes(normalized);
}

export function assertSingleMarketingTestRecipient(email: string): string {
  const trimmed = email.trim();
  if (!trimmed || trimmed.includes(",") || trimmed.includes(";") || /\s/.test(trimmed)) {
    throwAllowlist(MARKETING_SMTP_BLOCK.singleRecipientRequired);
  }
  return trimmed.toLowerCase();
}

/**
 * Live test_send: requested address must be on env ∩ frozen list.
 * Requested email is mandatory so operators cannot silently retarget.
 */
export function resolveExactMarketingLiveTestRecipient(requested?: string, raw?: string): string {
  if (requested == null || !String(requested).trim()) {
    throwAllowlist(MARKETING_SMTP_BLOCK.requestedRecipientRequired);
  }
  const normalized = assertSingleMarketingTestRecipient(String(requested));
  const allowlist = resolveMarketingLiveTestAllowlist(raw);
  if (allowlist.length === 0) {
    throwAllowlist(MARKETING_SMTP_BLOCK.allowlistEmpty);
  }
  if (!allowlist.includes(normalized) || !FROZEN.has(normalized)) {
    throwAllowlist(MARKETING_SMTP_BLOCK.recipientNotAllowlisted);
  }
  return normalized;
}

export function assertMarketingLiveTestRecipientAllowlisted(email: string, raw?: string): string {
  return resolveExactMarketingLiveTestRecipient(email, raw);
}

export function marketingLiveTestAllowlistConfigured(raw?: string): boolean {
  return resolveMarketingLiveTestAllowlist(raw).length > 0;
}

export const MARKETING_CONTROLLED_LIVE_TEST_RECIPIENT_COUNT = FROZEN_TEST_RECIPIENTS.length;
