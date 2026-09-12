/**
 * CO-MARKETING-HOSTINGER-SMTP-001B — Live test-send allowlist.
 * Default empty. Exact normalized email match only. Not a campaign audience.
 */

import {
  MARKETING_SMTP_BLOCK,
  MARKETING_TEST_RECIPIENT_ALLOWLIST_ENV,
} from "@/constants/enterprise-marketing-engine/hostinger-smtp";

export function parseMarketingTestRecipientAllowlist(
  raw: string | undefined = typeof process !== "undefined"
    ? process.env[MARKETING_TEST_RECIPIENT_ALLOWLIST_ENV]
    : undefined,
): string[] {
  return (raw ?? "")
    .split(/[,;\n]/g)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes("@") && !item.includes(" "));
}

export function resolveExactMarketingLiveTestRecipient(requested?: string): string {
  const allowlist = parseMarketingTestRecipientAllowlist();
  if (allowlist.length === 0) {
    throw Object.assign(new Error("Live Marketing test-send allowlist is empty"), {
      statusCode: 403,
      code: MARKETING_SMTP_BLOCK.allowlistEmpty,
    });
  }
  if (allowlist.length !== 1) {
    throw Object.assign(new Error("Live Marketing test-send requires exactly one allowlisted recipient"), {
      statusCode: 403,
      code: MARKETING_SMTP_BLOCK.allowlistNotExactlyOne,
    });
  }
  const only = allowlist[0];
  const requestedNorm = (requested ?? "").trim().toLowerCase();
  if (requestedNorm && requestedNorm !== only) {
    throw Object.assign(new Error("Test recipient is not on the live allowlist"), {
      statusCode: 403,
      code: MARKETING_SMTP_BLOCK.recipientNotAllowlisted,
    });
  }
  return only;
}

export function isMarketingLiveTestRecipientAllowlisted(
  email: string,
  raw?: string,
): boolean {
  const allowlist = parseMarketingTestRecipientAllowlist(raw);
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

export function assertMarketingLiveTestRecipientAllowlisted(
  email: string,
  raw?: string,
): string {
  const normalized = email.trim().toLowerCase();
  const allowlist = parseMarketingTestRecipientAllowlist(raw);
  if (allowlist.length === 0) {
    throw Object.assign(new Error("Live Marketing test-send allowlist is empty"), {
      statusCode: 403,
      code: MARKETING_SMTP_BLOCK.allowlistEmpty,
    });
  }
  if (!allowlist.includes(normalized)) {
    throw Object.assign(new Error("Test recipient is not on the live allowlist"), {
      statusCode: 403,
      code: MARKETING_SMTP_BLOCK.recipientNotAllowlisted,
    });
  }
  return normalized;
}
