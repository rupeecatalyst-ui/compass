/**
 * CO-MARKETING-REDESIGN-015 — Bounce, suppression, and engagement classification.
 * Durable records only. Never invent provider bounce kinds.
 */

import {
  MARKETING_ALWAYS_BLOCK_EMAIL_KINDS,
} from "@/constants/enterprise-marketing-engine/consent-suppression";
import { MARKETING_RETRY_MAX_ATTEMPTS } from "@/lib/enterprise-marketing-engine/durability/retry-policy";
import type { MarketingConsentSuppressionRecord } from "@/types/enterprise-marketing-consent";
import type {
  MarketingDurableEngagementEventRecord,
  MarketingDurableLedgerRecord,
  MarketingDurableSuppressionRecord,
} from "@/types/enterprise-marketing-durability";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import type { MarketingBounceCategory } from "@/types/enterprise-marketing-campaign-monitoring";
import type { MarketingProviderFailureCategory } from "@/types/enterprise-marketing-provider-contracts";

export function normalizeMarketingIdentityKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/^email:/, "");
}

export function marketingIdentitiesMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeMarketingIdentityKey(left);
  const b = normalizeMarketingIdentityKey(right);
  return Boolean(a) && a === b;
}

export function normalizeMarketingEventType(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function textSignals(values: Array<string | null | undefined>): string {
  return values
    .map((value) => (value ?? "").toUpperCase())
    .join(" ");
}

export function classifyMarketingBounceCategory(input: {
  ledger?: Pick<MarketingDurableLedgerRecord, "status" | "suppressionReason"> | null;
  engagements?: Array<Pick<MarketingDurableEngagementEventRecord, "eventType">>;
  durableSuppressions?: Array<Pick<MarketingDurableSuppressionRecord, "reason">>;
  consentRecords?: Array<Pick<MarketingConsentSuppressionRecord, "kind" | "reason">>;
}): MarketingBounceCategory | null {
  const blob = textSignals([
    input.ledger?.status,
    input.ledger?.suppressionReason,
    ...(input.engagements ?? []).map((row) => row.eventType),
    ...(input.durableSuppressions ?? []).map((row) => row.reason),
    ...(input.consentRecords ?? []).map((row) => `${row.kind} ${row.reason}`),
  ]);
  const hard =
    /\bHARD_BOUNCE\b/.test(blob) ||
    /\bINVALID_ADDRESS\b/.test(blob) ||
    (/\bBOUNCED\b/.test(blob) && /\bHARD\b/.test(blob));
  const soft = /\bSOFT_BOUNCE\b/.test(blob) || (/\bBOUNCED\b/.test(blob) && /\bSOFT\b/.test(blob));
  if (hard) return "hard";
  if (soft) return "soft";
  return null;
}

export function marketingRecipientIsUnsubscribed(input: {
  ledger?: Pick<MarketingDurableLedgerRecord, "unsubscribedAt" | "suppressionReason" | "status"> | null;
  engagements?: Array<Pick<MarketingDurableEngagementEventRecord, "eventType">>;
  consentRecords?: Array<Pick<MarketingConsentSuppressionRecord, "kind" | "reason" | "status">>;
}): boolean {
  if (input.ledger?.unsubscribedAt) return true;
  const blob = textSignals([
    input.ledger?.suppressionReason,
    input.ledger?.status,
    ...(input.engagements ?? []).map((row) => row.eventType),
    ...(input.consentRecords ?? [])
      .filter((row) => row.status === "ACTIVE")
      .map((row) => `${row.kind} ${row.reason}`),
  ]);
  return /\bUNSUBSCRIBE/.test(blob);
}

export function marketingRecipientHasComplaint(input: {
  ledger?: Pick<MarketingDurableLedgerRecord, "suppressionReason"> | null;
  engagements?: Array<Pick<MarketingDurableEngagementEventRecord, "eventType">>;
  consentRecords?: Array<Pick<MarketingConsentSuppressionRecord, "kind" | "reason" | "status">>;
}): boolean {
  const blob = textSignals([
    input.ledger?.suppressionReason,
    ...(input.engagements ?? []).map((row) => row.eventType),
    ...(input.consentRecords ?? [])
      .filter((row) => row.status === "ACTIVE")
      .map((row) => `${row.kind} ${row.reason}`),
  ]);
  return /\bSPAM_COMPLAINT\b/.test(blob) || /\bCOMPLAINT\b/.test(blob);
}

export function marketingRecipientIsPermanentlySuppressed(input: {
  ledger?: Pick<MarketingDurableLedgerRecord, "status" | "suppressionReason"> | null;
  durableSuppressions?: Array<Pick<MarketingDurableSuppressionRecord, "reason" | "consentStatus">>;
  consentRecords?: Array<
    Pick<MarketingConsentSuppressionRecord, "kind" | "duration" | "status">
  >;
}): boolean {
  if (input.ledger?.status === "suppressed") {
    const reason = (input.ledger.suppressionReason ?? "").toUpperCase();
    if (/\bSOFT_BOUNCE\b/.test(reason) || /\bTEMPORARY\b/.test(reason)) return false;
    return true;
  }
  const activeConsent = (input.consentRecords ?? []).filter((row) => row.status === "ACTIVE");
  if (
    activeConsent.some(
      (row) =>
        row.duration === "PERMANENT" ||
        (MARKETING_ALWAYS_BLOCK_EMAIL_KINDS as readonly string[]).includes(row.kind),
    )
  ) {
    return true;
  }
  return (input.durableSuppressions ?? []).some((row) => {
    const reason = (row.reason ?? "").toUpperCase();
    const status = (row.consentStatus ?? "").toUpperCase();
    if (status && status !== "ACTIVE" && status !== "GRANTED") return false;
    return (
      /\bHARD_BOUNCE\b/.test(reason) ||
      /\bUNSUBSCRIBE/.test(reason) ||
      /\bCOMPLAINT\b/.test(reason) ||
      /\bDO_NOT_CONTACT\b/.test(reason) ||
      /\bLEGAL\b/.test(reason)
    );
  });
}

export function marketingRecipientIsSuppressed(input: {
  ledger?: Pick<MarketingDurableLedgerRecord, "status"> | null;
  durableSuppressions?: unknown[];
  consentRecords?: Array<Pick<MarketingConsentSuppressionRecord, "status" | "kind">>;
}): boolean {
  if (input.ledger?.status === "suppressed") return true;
  if ((input.durableSuppressions ?? []).length > 0) return true;
  return (input.consentRecords ?? []).some(
    (row) => row.status === "ACTIVE" && row.kind !== "CONSENT_GRANTED",
  );
}

export function marketingRecipientIsQualified(input: {
  durableQualifications?: Array<{
    linkedContactId?: string | null;
    linkedOpportunityId?: string | null;
    contactCreated?: boolean;
    opportunityCreated?: boolean;
  }>;
  qualifications?: Array<Pick<MarketingQualificationRecord, "businessState">>;
}): boolean {
  if (
    (input.qualifications ?? []).some(
      (row) => row.businessState === "QUALIFIED" || row.businessState === "HANDED_OFF",
    )
  ) {
    return true;
  }
  return (input.durableQualifications ?? []).some(
    (row) =>
      Boolean(row.linkedContactId) ||
      Boolean(row.linkedOpportunityId) ||
      row.contactCreated === true ||
      row.opportunityCreated === true,
  );
}

export function marketingEngagementFlags(engagements: Array<Pick<MarketingDurableEngagementEventRecord, "eventType">> | undefined, ledger?: Pick<MarketingDurableLedgerRecord, "openedAt" | "clickedAt" | "repliedAt"> | null) {
  const types = new Set((engagements ?? []).map((row) => normalizeMarketingEventType(row.eventType)));
  return {
    opened: Boolean(ledger?.openedAt) || types.has("OPENED") || types.has("OPEN"),
    clicked: Boolean(ledger?.clickedAt) || types.has("CLICKED") || types.has("CLICK"),
    replied: Boolean(ledger?.repliedAt) || types.has("REPLIED") || types.has("REPLY"),
    accepted:
      types.has("ACCEPTED") ||
      types.has("PROVIDER_ACCEPTED") ||
      types.has("ACCEPTED_BY_PROVIDER") ||
      types.has("SENT"),
    delivered: types.has("DELIVERED") || types.has("DELIVERY_STATUS"),
  };
}

export function classifyMarketingFailureCategory(input: {
  status: string;
  attemptCount: number;
  bounceCategory: MarketingBounceCategory | null;
  unsubscribed: boolean;
  complaint: boolean;
  permanentlySuppressed: boolean;
}): MarketingProviderFailureCategory {
  if (input.unsubscribed || input.complaint || input.permanentlySuppressed) return "BLOCKED";
  if (input.bounceCategory === "hard") return "PERMANENT";
  if (input.status === "delivered" || input.status === "sent") return "NONE";
  if (input.status === "deferred" || input.bounceCategory === "soft") return "TEMPORARY";
  if (input.status === "failed") {
    return input.attemptCount >= MARKETING_RETRY_MAX_ATTEMPTS ? "PERMANENT" : "TEMPORARY";
  }
  if (input.status === "bounced" && input.bounceCategory == null) return "PERMANENT";
  return "NONE";
}

export function maskMarketingSourceKey(sourceKey: string | null | undefined): string {
  const raw = (sourceKey ?? "").trim();
  if (!raw) return "—";
  if (raw.includes("@")) {
    const at = raw.indexOf("@");
    const local = raw.slice(0, at);
    const domain = raw.slice(at + 1);
    return `${local.charAt(0) || "*"}***@${domain}`;
  }
  return raw;
}
