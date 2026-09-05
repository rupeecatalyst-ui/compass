/**
 * CO-MARKETING-REDESIGN-012 — Pure delivery/approval suppression evaluation.
 * Later unsubscribe blocks future delivery without rewriting frozen snapshots.
 */

import type { MarketingSuppressionReason } from "@/constants/enterprise-marketing-engine/audience";
import {
  MARKETING_ALWAYS_BLOCK_EMAIL_KINDS,
  type MarketingConsentRecordKind,
} from "@/constants/enterprise-marketing-engine/consent-suppression";
import type {
  MarketingConsentDeliveryDecision,
  MarketingConsentPolicy,
  MarketingConsentSuppressionRecord,
} from "@/types/enterprise-marketing-consent";
import { lacksRequiredMarketingConsent } from "@/lib/enterprise-marketing-engine/consent-policy";

const LEGACY_KIND: Record<string, MarketingConsentRecordKind> = {
  UNSUBSCRIBE: "UNSUBSCRIBED",
  DO_NOT_CONTACT: "LEGAL_COMPLIANCE",
  INVALID: "INVALID_ADDRESS",
  HARD_BOUNCE: "HARD_BOUNCE",
  COMPLAINT: "SPAM_COMPLAINT",
  PRIOR_SUPPRESSION: "MANUAL_SUPPRESSION",
  MANUAL: "MANUAL_SUPPRESSION",
};

export function canonicalMarketingConsentKind(
  reasonOrKind: string | null | undefined,
): MarketingConsentRecordKind | null {
  const raw = (reasonOrKind ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (raw in LEGACY_KIND) return LEGACY_KIND[raw]!;
  if (
    raw === "CONSENT_GRANTED" ||
    raw === "CONSENT_WITHDRAWN" ||
    raw === "UNSUBSCRIBED" ||
    raw === "INVALID_ADDRESS" ||
    raw === "HARD_BOUNCE" ||
    raw === "SOFT_BOUNCE" ||
    raw === "SPAM_COMPLAINT" ||
    raw === "MANUAL_SUPPRESSION" ||
    raw === "LEGAL_COMPLIANCE" ||
    raw === "TEMPORARY_SUPPRESSION" ||
    raw === "CAMPAIGN_EXCLUSION"
  ) {
    return raw;
  }
  return null;
}

export function marketingConsentKindIsActive(
  record: MarketingConsentSuppressionRecord,
  atIso: string,
): boolean {
  if (record.status === "LIFTED" || record.status === "SUPERSEDED") return false;
  if (record.status === "EXPIRED") return false;
  if (record.duration === "TEMPORARY") {
    if (!record.expiresAt) return false;
    if (record.expiresAt <= atIso) return false;
  }
  if (record.effectiveAt && record.effectiveAt > atIso) return false;
  return true;
}

function codeForKind(kind: MarketingConsentRecordKind): MarketingConsentDeliveryDecision["code"] {
  switch (kind) {
    case "UNSUBSCRIBED":
      return "unsubscribe";
    case "HARD_BOUNCE":
      return "hard_bounce";
    case "SPAM_COMPLAINT":
      return "complaint";
    case "CONSENT_WITHDRAWN":
      return "consent_withdrawn";
    case "TEMPORARY_SUPPRESSION":
      return "temporary";
    case "MANUAL_SUPPRESSION":
      return "manual";
    case "LEGAL_COMPLIANCE":
      return "legal";
    case "INVALID_ADDRESS":
      return "invalid";
    case "CAMPAIGN_EXCLUSION":
      return "campaign_exclusion";
    case "SOFT_BOUNCE":
      return "soft_bounce";
    default:
      return "manual";
  }
}

function identityMatches(record: MarketingConsentSuppressionRecord, fingerprints: string[]): boolean {
  const set = new Set(fingerprints.map((item) => item.trim().toLowerCase()).filter(Boolean));
  if (set.has(record.fingerprint.toLowerCase())) return true;
  if (record.normalizedIdentity && set.has(record.normalizedIdentity.toLowerCase())) return true;
  if (record.normalizedEmail && set.has(`email:${record.normalizedEmail}`)) return true;
  return false;
}

function channelMatches(record: MarketingConsentSuppressionRecord, channel: string): boolean {
  if (record.channel === "ALL") return true;
  return record.channel.toUpperCase() === channel.toUpperCase();
}

export function evaluateMarketingDeliveryBlock(input: {
  records: MarketingConsentSuppressionRecord[];
  policy: MarketingConsentPolicy;
  phase: "snapshot_approval" | "delivery";
  channel: string;
  fingerprints: string[];
  consentValue?: string | null;
  campaignId?: string | null;
  at?: string;
  applyOptionalOrgSuppression?: boolean;
  allowedReasons?: Array<MarketingSuppressionReason | string>;
}): MarketingConsentDeliveryDecision {
  const at = input.at ?? new Date().toISOString();
  const channel = (input.channel || "EMAIL").toUpperCase();
  const allow = (input.allowedReasons ?? []).map((item) => item.toUpperCase());
  const applyOptional = input.applyOptionalOrgSuppression !== false;

  const checkConsent =
    input.phase === "snapshot_approval" || input.consentValue !== undefined;
  if (checkConsent && lacksRequiredMarketingConsent(input.consentValue, input.policy)) {
    return {
      blocked: true,
      phase: input.phase,
      recordId: null,
      kind: null,
      reason: "missing_or_non_positive_consent",
      code: "missing_consent",
      historicalSnapshotPreserved: true,
    };
  }

  const ranked = input.records
    .filter((record) => record.organizationId === input.policy.organizationId)
    .filter((record) => marketingConsentKindIsActive(record, at))
    .filter((record) => identityMatches(record, input.fingerprints))
    .filter((record) => channelMatches(record, channel))
    .filter((record) => record.kind !== "CONSENT_GRANTED");

  for (const record of ranked) {
    if (record.kind === "CAMPAIGN_EXCLUSION") {
      if (!input.campaignId || record.campaignId !== input.campaignId) continue;
    }
    const always =
      (MARKETING_ALWAYS_BLOCK_EMAIL_KINDS as readonly string[]).includes(record.kind) &&
      channel === "EMAIL";
    if (!always && !applyOptional) continue;
    if (allow.length && !always && !allow.includes(String(record.reason).toUpperCase()) && !allow.includes(record.kind)) {
      continue;
    }
    if (record.kind === "HARD_BOUNCE" && !input.policy.hardBounceBlocksEmail) continue;
    if (record.kind === "SPAM_COMPLAINT" && !input.policy.complaintBlocksEmail) continue;
    if (record.kind === "UNSUBSCRIBED" && !input.policy.unsubscribeBlocksDelivery) continue;
    if (record.kind === "CONSENT_WITHDRAWN" && !input.policy.withdrawnBlocksDelivery) continue;
    return {
      blocked: true,
      phase: input.phase,
      recordId: record.id,
      kind: record.kind,
      reason: String(record.reason),
      code: codeForKind(record.kind),
      historicalSnapshotPreserved: true,
    };
  }

  return {
    blocked: false,
    phase: input.phase,
    recordId: null,
    kind: null,
    reason: null,
    code: "not_blocked",
    historicalSnapshotPreserved: true,
  };
}

export function laterUnsubscribePreventsDelivery(input: {
  snapshotContainedRecipient: boolean;
  unsubscribedAfterFreeze: boolean;
  decision: MarketingConsentDeliveryDecision;
}): boolean {
  return (
    input.snapshotContainedRecipient &&
    input.unsubscribedAfterFreeze &&
    input.decision.blocked &&
    input.decision.code === "unsubscribe" &&
    input.decision.historicalSnapshotPreserved
  );
}
