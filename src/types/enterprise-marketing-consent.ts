/**
 * CO-MARKETING-REDESIGN-012 — Durable consent / suppression domain types.
 * Not a prospect database. Not the Enterprise Document Registry.
 */

import type { MarketingSuppressionReason } from "@/constants/enterprise-marketing-engine/audience";
import type {
  MarketingConsentChannel,
  MarketingConsentDuration,
  MarketingConsentRecordKind,
  MarketingConsentRecordStatus,
  MarketingConsentSource,
} from "@/constants/enterprise-marketing-engine/consent-suppression";

export type MarketingConsentPolicy = {
  organizationId: string;
  requireExplicitConsent: boolean;
  grantedValues: string[];
  withdrawnBlocksDelivery: boolean;
  hardBounceBlocksEmail: boolean;
  complaintBlocksEmail: boolean;
  unsubscribeBlocksDelivery: boolean;
  temporaryExpiryRequired: boolean;
  updatedAt: string;
  updatedByUserId: string | null;
};

export type MarketingConsentSuppressionRecord = {
  id: string;
  organizationId: string;
  channel: MarketingConsentChannel;
  normalizedIdentity: string;
  fingerprint: string;
  normalizedEmail: string | null;
  kind: MarketingConsentRecordKind;
  /** Legacy eligibility/analytics reason (UNSUBSCRIBE, HARD_BOUNCE, …). */
  reason: MarketingSuppressionReason;
  status: MarketingConsentRecordStatus;
  duration: MarketingConsentDuration;
  source: MarketingConsentSource;
  note: string | null;
  effectiveAt: string;
  expiresAt: string | null;
  campaignId: string | null;
  providerEventId: string | null;
  actorUserId: string | null;
  createdAt: string;
  updatedAt: string;
  auditTimestamp: string;
};

export type MarketingConsentDeliveryDecision = {
  blocked: boolean;
  phase: "snapshot_approval" | "delivery";
  recordId: string | null;
  kind: MarketingConsentRecordKind | null;
  reason: string | null;
  code:
    | "not_blocked"
    | "unsubscribe"
    | "hard_bounce"
    | "complaint"
    | "consent_withdrawn"
    | "missing_consent"
    | "temporary"
    | "manual"
    | "legal"
    | "invalid"
    | "campaign_exclusion"
    | "soft_bounce";
  historicalSnapshotPreserved: true;
};

export type MarketingConsentCentreCard = {
  id: string;
  label: string;
  count: number | null;
  availability: "available" | "unavailable";
};

export type MarketingConsentExportRow = {
  id: string;
  organizationId: string;
  kind: MarketingConsentRecordKind;
  status: MarketingConsentRecordStatus;
  channel: MarketingConsentChannel;
  identityPreview: string;
  reason: string;
  source: MarketingConsentSource;
  effectiveAt: string;
  expiresAt: string | null;
  campaignId: string | null;
  actorPreview: string;
  auditTimestamp: string;
};
