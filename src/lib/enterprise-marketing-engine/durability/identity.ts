/**
 * CO-MARKETING-REDESIGN-001 — Identity helpers for frozen snapshot / ledger rows.
 * Does not create Contact or Opportunity records.
 */

import type { MarketingColumnMap } from "@/types/enterprise-marketing-durability";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeMarketingLedgerEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function assertNormalizedMarketingEmail(value: string): string {
  const email = normalizeMarketingLedgerEmail(value);
  if (!EMAIL_RE.test(email)) {
    throw Object.assign(new Error("A valid normalised email is required"), {
      statusCode: 400,
      code: "INVALID_NORMALIZED_EMAIL",
    });
  }
  return email;
}

export function buildMarketingLedgerIdempotencyKey(input: {
  organizationId: string;
  campaignId: string;
  channel: string;
  normalizedEmail: string;
}): string {
  const email = normalizeMarketingLedgerEmail(input.normalizedEmail);
  return `${input.organizationId}:${input.campaignId}:${input.channel}:${email}`.toLowerCase();
}

export function assertMarketingColumnMap(map: MarketingColumnMap): void {
  const email = map.email?.trim();
  if (!email) {
    throw Object.assign(new Error("Column map must include the email source column"), {
      statusCode: 400,
      code: "INVALID_COLUMN_MAP",
    });
  }
}

export function buildMarketingSourceStableKey(input: {
  mappedKey?: string | null;
  sourceRowNumber?: number | null;
}): string {
  const mapped = input.mappedKey?.trim();
  if (mapped) return mapped.toLowerCase();
  if (input.sourceRowNumber != null && Number.isInteger(input.sourceRowNumber)) {
    return `row:${input.sourceRowNumber}`;
  }
  throw Object.assign(new Error("A stable source key or source row number is required"), {
    statusCode: 400,
    code: "INVALID_SOURCE_STABLE_KEY",
  });
}
