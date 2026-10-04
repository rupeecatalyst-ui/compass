/**
 * CO-MARKETING-REDESIGN-015 — Chronological recipient event timeline.
 * Append-only compose. Earlier events are never rewritten.
 */

import { MARKETING_CAMPAIGN_MONITORING_NOTICE } from "@/constants/enterprise-marketing-engine/campaign-monitoring";
import { maskMarketingRecipientEmail } from "@/lib/enterprise-marketing-engine/recipient-explorer";
import type { MarketingConsentSuppressionRecord } from "@/types/enterprise-marketing-consent";
import type {
  MarketingDurableEngagementEventRecord,
  MarketingDurableLedgerRecord,
  MarketingDurableQualificationRecord,
  MarketingDurableSnapshotRecipientRecord,
  MarketingDurableSuppressionRecord,
} from "@/types/enterprise-marketing-durability";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import type {
  MarketingRecipientTimeline,
  MarketingRecipientTimelineEvent,
} from "@/types/enterprise-marketing-campaign-monitoring";
import {
  marketingIdentitiesMatch,
  maskMarketingSourceKey,
} from "./campaign-monitoring-classify";

function pushEvent(
  events: MarketingRecipientTimelineEvent[],
  event: MarketingRecipientTimelineEvent,
) {
  events.push(event);
}

export function composeMarketingRecipientTimeline(input: {
  organizationId: string;
  recipientId: string;
  durableAvailable: boolean;
  recipients?: MarketingDurableSnapshotRecipientRecord[];
  ledger?: MarketingDurableLedgerRecord[];
  engagements?: MarketingDurableEngagementEventRecord[];
  durableSuppressions?: MarketingDurableSuppressionRecord[];
  consentRecords?: MarketingConsentSuppressionRecord[];
  durableQualifications?: MarketingDurableQualificationRecord[];
  qualifications?: MarketingQualificationRecord[];
}): MarketingRecipientTimeline | null {
  const recipient = (input.recipients ?? []).find(
    (row) => row.id === input.recipientId && row.organizationId === input.organizationId,
  );
  if (!recipient) return null;

  const events: MarketingRecipientTimelineEvent[] = [];
  pushEvent(events, {
    id: `snapshot:${recipient.id}`,
    occurredAt: recipient.createdAt,
    type: "SNAPSHOTTED",
    summary: "Recipient frozen into the approved audience snapshot",
    source: "snapshot",
  });

  const ledger = (input.ledger ?? []).find(
    (row) =>
      row.snapshotRecipientId === recipient.id && row.organizationId === input.organizationId,
  );
  if (ledger) {
    pushEvent(events, {
      id: `ledger-created:${ledger.id}`,
      occurredAt: ledger.createdAt,
      type: "LEDGER_CREATED",
      summary: `Delivery ledger opened (${ledger.status})`,
      source: "ledger",
    });
    if (ledger.scheduledAt) {
      pushEvent(events, {
        id: `ledger-scheduled:${ledger.id}`,
        occurredAt: ledger.scheduledAt,
        type: "SCHEDULED",
        summary: "Queued for a delivery batch",
        source: "ledger",
      });
    }
    if (ledger.claimedAt) {
      pushEvent(events, {
        id: `ledger-claimed:${ledger.id}`,
        occurredAt: ledger.claimedAt,
        type: "ATTEMPTED",
        summary: `Attempt ${ledger.attemptCount}`,
        source: "ledger",
      });
    }
    if (ledger.processedAt) {
      pushEvent(events, {
        id: `ledger-processed:${ledger.id}`,
        occurredAt: ledger.processedAt,
        type: ledger.status.toUpperCase(),
        summary: `Current ledger status: ${ledger.status}`,
        source: "ledger",
      });
    }
    if (ledger.openedAt) {
      pushEvent(events, {
        id: `ledger-opened:${ledger.id}`,
        occurredAt: ledger.openedAt,
        type: "OPENED",
        summary: "Open recorded on the delivery ledger",
        source: "ledger",
      });
    }
    if (ledger.clickedAt) {
      pushEvent(events, {
        id: `ledger-clicked:${ledger.id}`,
        occurredAt: ledger.clickedAt,
        type: "CLICKED",
        summary: "Click recorded on the delivery ledger",
        source: "ledger",
      });
    }
    if (ledger.repliedAt) {
      pushEvent(events, {
        id: `ledger-replied:${ledger.id}`,
        occurredAt: ledger.repliedAt,
        type: "REPLIED",
        summary: "Reply recorded on the delivery ledger",
        source: "ledger",
      });
    }
    if (ledger.unsubscribedAt) {
      pushEvent(events, {
        id: `ledger-unsubscribed:${ledger.id}`,
        occurredAt: ledger.unsubscribedAt,
        type: "UNSUBSCRIBED",
        summary: "Unsubscribe recorded on the delivery ledger",
        source: "ledger",
      });
    }
  }

  for (const event of input.engagements ?? []) {
    if (event.organizationId !== input.organizationId) continue;
    if (!ledger || event.ledgerId !== ledger.id) continue;
    pushEvent(events, {
      id: `engagement:${event.id}`,
      occurredAt: event.occurredAt,
      type: event.eventType,
      summary: `Engagement event ${event.eventType}`,
      source: "engagement",
    });
  }

  for (const row of input.durableSuppressions ?? []) {
    if (row.organizationId !== input.organizationId) continue;
    if (
      !marketingIdentitiesMatch(row.identityFingerprint, recipient.recipientFingerprint) &&
      !marketingIdentitiesMatch(row.normalizedEmail, recipient.normalizedEmail)
    ) {
      continue;
    }
    pushEvent(events, {
      id: `durable-suppression:${row.id}`,
      occurredAt: row.createdAt,
      type: "SUPPRESSED",
      summary: `Durable suppression (${row.reason})`,
      source: "suppression",
    });
  }

  for (const row of input.consentRecords ?? []) {
    if (row.organizationId !== input.organizationId) continue;
    if (
      !marketingIdentitiesMatch(row.fingerprint, recipient.recipientFingerprint) &&
      !marketingIdentitiesMatch(row.normalizedIdentity, recipient.normalizedEmail)
    ) {
      continue;
    }
    pushEvent(events, {
      id: `consent:${row.id}:${row.auditTimestamp}`,
      occurredAt: row.auditTimestamp || row.createdAt,
      type: row.kind,
      summary: `Consent / suppression record ${row.kind}`,
      source: "suppression",
    });
  }

  for (const row of input.qualifications ?? []) {
    if (row.organizationId !== input.organizationId) continue;
    if (row.campaignId !== recipient.campaignId) continue;
    if (!marketingIdentitiesMatch(row.recipientFingerprint, recipient.recipientFingerprint)) continue;
    pushEvent(events, {
      id: `qualification:${row.id}`,
      occurredAt: row.createdAt,
      type: row.businessState,
      summary: `Qualification record ${row.businessState}`,
      source: "qualification",
    });
  }

  for (const row of input.durableQualifications ?? []) {
    if (row.organizationId !== input.organizationId) continue;
    if (row.campaignId !== recipient.campaignId) continue;
    if (!marketingIdentitiesMatch(row.recipientFingerprint, recipient.recipientFingerprint)) continue;
    pushEvent(events, {
      id: `durable-qualification:${row.id}`,
      occurredAt: row.createdAt,
      type: "QUALIFICATION",
      summary: "Durable qualification record",
      source: "qualification",
    });
  }

  const chronological = [...events].sort((a, b) => {
    const byTime = a.occurredAt.localeCompare(b.occurredAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });

  return {
    recipientId: recipient.id,
    organizationId: recipient.organizationId,
    campaignId: recipient.campaignId,
    identityPreview: maskMarketingRecipientEmail(recipient.normalizedEmail),
    sourceKey: maskMarketingSourceKey(recipient.sourceStableKey),
    events: chronological,
    durableAvailable: input.durableAvailable,
    notice: input.durableAvailable
      ? MARKETING_CAMPAIGN_MONITORING_NOTICE
      : "Unavailable — durable recipient records are not connected.",
  };
}
