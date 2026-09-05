/**
 * CO-MARKETING-REDESIGN-015 — Campaign monitoring summary from durable records.
 * Provider-dependent metrics are Unavailable when the provider is not connected
 * and no ingested events exist. Never fabricate zeroes as live provider truth.
 */

import {
  availableMarketingMetric,
  unavailableMarketingMetric,
} from "@/lib/enterprise-marketing-engine/home-overview";
import { MARKETING_CAMPAIGN_MONITORING_NOTICE } from "@/constants/enterprise-marketing-engine/campaign-monitoring";
import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type { MarketingConsentSuppressionRecord } from "@/types/enterprise-marketing-consent";
import type {
  MarketingDurableAudienceSnapshotRecord,
  MarketingDurableEngagementEventRecord,
  MarketingDurableLedgerRecord,
  MarketingDurableQualificationRecord,
  MarketingDurableSnapshotRecipientRecord,
  MarketingDurableSuppressionRecord,
} from "@/types/enterprise-marketing-durability";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import type {
  MarketingCampaignMonitoringCapabilities,
  MarketingCampaignMonitoringMetricKey,
  MarketingCampaignMonitoringSummary,
} from "@/types/enterprise-marketing-campaign-monitoring";
import {
  classifyMarketingBounceCategory,
  marketingEngagementFlags,
  marketingIdentitiesMatch,
  marketingRecipientIsQualified,
  marketingRecipientIsUnsubscribed,
  normalizeMarketingEventType,
} from "./campaign-monitoring-classify";

export type MarketingCampaignMonitoringComposeInput = {
  organizationId: string;
  campaignId?: string | null;
  durableAvailable: boolean;
  providerConnected: boolean;
  generatedAt?: string;
  snapshots?: MarketingDurableAudienceSnapshotRecord[];
  snapshotRecipients?: MarketingDurableSnapshotRecipientRecord[];
  ledger?: MarketingDurableLedgerRecord[];
  engagements?: MarketingDurableEngagementEventRecord[];
  durableSuppressions?: MarketingDurableSuppressionRecord[];
  consentRecords?: MarketingConsentSuppressionRecord[];
  durableQualifications?: MarketingDurableQualificationRecord[];
  qualifications?: MarketingQualificationRecord[];
  capabilities?: MarketingCampaignMonitoringCapabilities;
};

function providerOrUnavailable(input: {
  providerConnected: boolean;
  durableAvailable: boolean;
  ingested: number;
}): MarketingMetricValue {
  if (!input.durableAvailable) return unavailableMarketingMetric("Unavailable");
  if (input.ingested > 0) {
    return {
      availability: "ingested",
      value: input.ingested,
      reason: "Durable ledger / engagement timestamps",
    };
  }
  if (!input.providerConnected) return unavailableMarketingMetric("Unavailable");
  return availableMarketingMetric(0);
}

function durableCount(durableAvailable: boolean, value: number): MarketingMetricValue {
  if (!durableAvailable) return unavailableMarketingMetric("Unavailable");
  return availableMarketingMetric(value);
}

function latestSnapshotsByCampaign(
  snapshots: MarketingDurableAudienceSnapshotRecord[],
): MarketingDurableAudienceSnapshotRecord[] {
  const latest = new Map<string, MarketingDurableAudienceSnapshotRecord>();
  for (const row of snapshots) {
    const prev = latest.get(row.campaignId);
    if (!prev || row.frozenAt.localeCompare(prev.frozenAt) > 0) {
      latest.set(row.campaignId, row);
    }
  }
  return [...latest.values()];
}

function inOrgCampaign<T extends { organizationId: string; campaignId?: string | null }>(
  rows: T[],
  organizationId: string,
  campaignId: string | null,
): T[] {
  return rows.filter((row) => {
    if (row.organizationId !== organizationId) return false;
    if (campaignId && row.campaignId && row.campaignId !== campaignId) return false;
    return true;
  });
}

export function composeMarketingCampaignMonitoringSummary(
  input: MarketingCampaignMonitoringComposeInput,
): MarketingCampaignMonitoringSummary {
  const campaignId = input.campaignId?.trim() || null;
  const snapshots = inOrgCampaign(input.snapshots ?? [], input.organizationId, campaignId);
  const recipients = inOrgCampaign(input.snapshotRecipients ?? [], input.organizationId, campaignId);
  const ledger = inOrgCampaign(input.ledger ?? [], input.organizationId, campaignId);
  const engagements = inOrgCampaign(input.engagements ?? [], input.organizationId, campaignId);
  const durableSuppressions = (input.durableSuppressions ?? []).filter(
    (row) => row.organizationId === input.organizationId,
  );
  const consentRecords = (input.consentRecords ?? []).filter(
    (row) => row.organizationId === input.organizationId,
  );
  const durableQualifications = inOrgCampaign(
    input.durableQualifications ?? [],
    input.organizationId,
    campaignId,
  );
  const qualifications = inOrgCampaign(input.qualifications ?? [], input.organizationId, campaignId);

  const latest = latestSnapshotsByCampaign(snapshots);
  const latestIds = new Set(latest.map((row) => row.id));
  const frozenAudience = recipients.filter((row) => latestIds.size === 0 || latestIds.has(row.snapshotId)).length;

  const queued = ledger.filter((row) => row.status === "queued" || row.status === "scheduled").length;
  const attempted = ledger.filter(
    (row) =>
      row.attemptCount > 0 ||
      row.status === "processing" ||
      row.status === "sent" ||
      row.status === "delivered" ||
      row.status === "failed" ||
      row.status === "bounced" ||
      row.status === "deferred",
  ).length;
  const deferred = ledger.filter((row) => row.status === "deferred").length;
  const failed = ledger.filter((row) => row.status === "failed").length;

  const providerAcceptedIngested = ledger.filter(
    (row) =>
      row.status === "sent" ||
      Boolean(row.providerMessageId) ||
      marketingEngagementFlags(
        engagements.filter((event) => event.ledgerId === row.id),
        row,
      ).accepted,
  ).length;
  const deliveredIngested =
    ledger.filter((row) => row.status === "delivered").length +
    engagements.filter((row) => {
      const type = normalizeMarketingEventType(row.eventType);
      return type === "DELIVERED" && !ledger.some((entry) => entry.id === row.ledgerId && entry.status === "delivered");
    }).length;

  let softBounced = 0;
  let hardBounced = 0;
  for (const row of ledger) {
    const relatedEngagements = engagements.filter((event) => event.ledgerId === row.id);
    const relatedConsent = consentRecords.filter(
      (record) =>
        marketingIdentitiesMatch(record.fingerprint, row.normalizedEmail) ||
        marketingIdentitiesMatch(record.normalizedIdentity, row.normalizedEmail),
    );
    const relatedDurable = durableSuppressions.filter((record) =>
      marketingIdentitiesMatch(record.identityFingerprint, row.normalizedEmail),
    );
    const bounce = classifyMarketingBounceCategory({
      ledger: row,
      engagements: relatedEngagements,
      durableSuppressions: relatedDurable,
      consentRecords: relatedConsent,
    });
    if (bounce === "soft") softBounced += 1;
    if (bounce === "hard") hardBounced += 1;
  }

  const openedIngested =
    ledger.filter((row) => Boolean(row.openedAt)).length +
    engagements.filter((row) => {
      const type = normalizeMarketingEventType(row.eventType);
      return type === "OPENED" || type === "OPEN";
    }).length;
  const clickedIngested =
    ledger.filter((row) => Boolean(row.clickedAt)).length +
    engagements.filter((row) => {
      const type = normalizeMarketingEventType(row.eventType);
      return type === "CLICKED" || type === "CLICK";
    }).length;
  const repliedIngested =
    ledger.filter((row) => Boolean(row.repliedAt)).length +
    engagements.filter((row) => {
      const type = normalizeMarketingEventType(row.eventType);
      return type === "REPLIED" || type === "REPLY";
    }).length;

  const unsubscribed = ledger.filter((row) =>
    marketingRecipientIsUnsubscribed({
      ledger: row,
      engagements: engagements.filter((event) => event.ledgerId === row.id),
      consentRecords: consentRecords.filter((record) =>
        marketingIdentitiesMatch(record.fingerprint, row.normalizedEmail),
      ),
    }),
  ).length;
  const suppressed =
    ledger.filter((row) => row.status === "suppressed").length +
    durableSuppressions.length +
    consentRecords.filter((row) => row.status === "ACTIVE" && row.kind !== "CONSENT_GRANTED").length;

  const qualifiedInbox = qualifications.filter(
    (row) => row.businessState === "QUALIFIED" || row.businessState === "HANDED_OFF",
  );
  const qualifiedDurable = durableQualifications.filter((row) =>
    marketingRecipientIsQualified({ durableQualifications: [row] }),
  );

  const metrics: Record<MarketingCampaignMonitoringMetricKey, MarketingMetricValue> = {
    frozenAudience: durableCount(input.durableAvailable, frozenAudience),
    queued: durableCount(input.durableAvailable, queued),
    attempted: durableCount(input.durableAvailable, attempted),
    providerAccepted: providerOrUnavailable({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: providerAcceptedIngested,
    }),
    delivered: providerOrUnavailable({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: deliveredIngested,
    }),
    deferred: durableCount(input.durableAvailable, deferred),
    failed: durableCount(input.durableAvailable, failed),
    softBounced: providerOrUnavailable({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: softBounced,
    }),
    hardBounced: providerOrUnavailable({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: hardBounced,
    }),
    opened: providerOrUnavailable({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: openedIngested,
    }),
    clicked: providerOrUnavailable({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: clickedIngested,
    }),
    replied: providerOrUnavailable({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: repliedIngested,
    }),
    unsubscribed: durableCount(input.durableAvailable, unsubscribed),
    suppressed: durableCount(input.durableAvailable, suppressed),
    qualified: durableCount(
      input.durableAvailable,
      qualifications.length > 0 ? qualifiedInbox.length : qualifiedDurable.length,
    ),
  };

  return {
    sprint: "CO-MARKETING-REDESIGN-015",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    organizationId: input.organizationId,
    campaignId,
    durableAvailable: input.durableAvailable,
    providerConnected: input.providerConnected,
    notice: MARKETING_CAMPAIGN_MONITORING_NOTICE,
    metrics,
    capabilities: input.capabilities ?? {
      retry: false,
      suppress: false,
      viewSuppression: false,
      openQualification: false,
    },
  };
}
