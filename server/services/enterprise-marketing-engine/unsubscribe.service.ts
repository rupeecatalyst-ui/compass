/**
 * CO-MARKETING-LIVE-EMAIL-FOUNDATION-001 — Public marketing unsubscribe.
 * Unauthenticated. Idempotent. Persists via existing suppression ledger. No PII in responses.
 */

import { redactMarketingFingerprint } from "@/lib/enterprise-marketing-engine/analytics/redact-fingerprint";
import { marketingUnsubscribeChannel } from "@/lib/enterprise-marketing-engine/unsubscribe-scope";
import { parseMarketingUnsubscribeToken } from "@/lib/enterprise-marketing-engine/unsubscribe-token";
import { recordMarketingAuditEvent } from "./audit";
import { marketingSuppressionStore } from "./suppression-store";

export type MarketingPublicUnsubscribePeek = {
  valid: boolean;
};

export type MarketingPublicUnsubscribeResult = {
  ok: boolean;
  alreadyUnsubscribed: boolean;
  valid: boolean;
};

const GENERIC_INVALID: MarketingPublicUnsubscribeResult = {
  ok: false,
  alreadyUnsubscribed: false,
  valid: false,
};

export const marketingUnsubscribeService = {
  peek(token: string): MarketingPublicUnsubscribePeek {
    const payload = parseMarketingUnsubscribeToken(token);
    return { valid: Boolean(payload) };
  },

  confirm(token: string): MarketingPublicUnsubscribeResult {
    const payload = parseMarketingUnsubscribeToken(token);
    if (!payload) return GENERIC_INVALID;

    const existing = marketingSuppressionStore.history(payload.o, payload.f).find(
      (row) => row.kind === "UNSUBSCRIBED" && row.status === "ACTIVE",
    );

    const record = marketingSuppressionStore.upsert({
      organizationId: payload.o,
      fingerprint: payload.f,
      reason: "UNSUBSCRIBE",
      kind: "UNSUBSCRIBED",
      channel: marketingUnsubscribeChannel(),
      source: "PUBLIC_UNSUBSCRIBE",
      campaignId: payload.c,
      note: "Public marketing unsubscribe",
    });

    recordMarketingAuditEvent({
      kind: "consent.public_unsubscribe",
      organizationId: payload.o,
      action: existing ? "unsubscribe.repeat" : "unsubscribe.confirm",
      objectType: "marketing_suppression",
      objectId: record.id,
      campaignId: payload.c,
      resultingState: "UNSUBSCRIBED",
      reason: "public_unsubscribe",
      detail: {
        fingerprint: redactMarketingFingerprint(payload.f),
        alreadyUnsubscribed: Boolean(existing),
      },
    });

    return {
      ok: true,
      alreadyUnsubscribed: Boolean(existing),
      valid: true,
    };
  },
};
