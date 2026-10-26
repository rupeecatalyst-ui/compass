/**
 * CO-MARKETING-REDESIGN-015 — Campaign recipient explorer with authorised filters.
 * Masks identity. Source key is the snapshot stable key, never raw email.
 */

import { MARKETING_CAMPAIGN_MONITORING_NOTICE } from "@/constants/enterprise-marketing-engine/campaign-monitoring";
import { MARKETING_RETRY_MAX_ATTEMPTS } from "@/lib/enterprise-marketing-engine/durability/retry-policy";
import { maskMarketingRecipientEmail } from "@/lib/enterprise-marketing-engine/recipient-explorer";
import { redactMarketingFingerprint } from "@/lib/enterprise-marketing-engine/analytics/redact-fingerprint";
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
  MarketingCampaignRecipientExplorerFilters,
  MarketingCampaignRecipientExplorerPage,
  MarketingCampaignRecipientExplorerRow,
} from "@/types/enterprise-marketing-campaign-monitoring";
import {
  classifyMarketingBounceCategory,
  classifyMarketingFailureCategory,
  marketingEngagementFlags,
  marketingIdentitiesMatch,
  marketingRecipientHasComplaint,
  marketingRecipientIsPermanentlySuppressed,
  marketingRecipientIsQualified,
  marketingRecipientIsSuppressed,
  marketingRecipientIsUnsubscribed,
  maskMarketingSourceKey,
} from "./campaign-monitoring-classify";
import {
  evaluateMarketingMonitoringRetry,
  resolveMarketingMonitoringNextAction,
} from "./monitoring-retry";
import { marketingMonitoringTimestampIso, marketingMonitoringTimestampMs } from "./monitoring-time";

function relatedByIdentity<T extends { fingerprint?: string; identityFingerprint?: string; normalizedIdentity?: string; normalizedEmail?: string | null; recipientFingerprint?: string }>(
  rows: T[],
  recipient: MarketingDurableSnapshotRecipientRecord,
  ledger: MarketingDurableLedgerRecord | null,
): T[] {
  return rows.filter((row) => {
    const keys = [
      row.fingerprint,
      row.identityFingerprint,
      row.normalizedIdentity,
      row.normalizedEmail,
      row.recipientFingerprint,
    ];
    return keys.some(
      (key) =>
        marketingIdentitiesMatch(key, recipient.normalizedEmail) ||
        marketingIdentitiesMatch(key, recipient.recipientFingerprint) ||
        marketingIdentitiesMatch(key, ledger?.normalizedEmail),
    );
  });
}

function pushMonitoringEvent(
  candidates: Array<{ label: string; at: string; ms: number }>,
  label: string,
  value: unknown,
) {
  const ms = marketingMonitoringTimestampMs(value);
  const at = marketingMonitoringTimestampIso(value);
  if (ms == null || !at) return;
  candidates.push({ label, at, ms });
}

function latestEventLabel(input: {
  ledger: MarketingDurableLedgerRecord | null;
  engagements: MarketingDurableEngagementEventRecord[];
}): { label: string | null; at: string | null } {
  const candidates: Array<{ label: string; at: string; ms: number }> = [];
  if (input.ledger) {
    const updatedMs = marketingMonitoringTimestampMs(input.ledger.updatedAt);
    pushMonitoringEvent(
      candidates,
      `Ledger ${input.ledger.status}`,
      updatedMs != null ? input.ledger.updatedAt : input.ledger.createdAt,
    );
    if (input.ledger.processedAt) pushMonitoringEvent(candidates, "Processed", input.ledger.processedAt);
    if (input.ledger.openedAt) pushMonitoringEvent(candidates, "Opened", input.ledger.openedAt);
    if (input.ledger.clickedAt) pushMonitoringEvent(candidates, "Clicked", input.ledger.clickedAt);
    if (input.ledger.repliedAt) pushMonitoringEvent(candidates, "Replied", input.ledger.repliedAt);
    if (input.ledger.unsubscribedAt) pushMonitoringEvent(candidates, "Unsubscribed", input.ledger.unsubscribedAt);
  }
  for (const event of input.engagements) {
    pushMonitoringEvent(candidates, event.eventType, event.occurredAt);
  }
  candidates.sort((a, b) => a.ms - b.ms || a.label.localeCompare(b.label));
  const last = candidates[candidates.length - 1];
  return { label: last?.label ?? null, at: last?.at ?? null };
}

function inRange(iso: string | null, from?: string | null, to?: string | null): boolean {
  const fromMs = from ? marketingMonitoringTimestampMs(from) : null;
  const toMs = to ? marketingMonitoringTimestampMs(to) : null;
  if (fromMs == null && toMs == null) return true;
  const ms = marketingMonitoringTimestampMs(iso);
  if (ms == null) return false;
  if (fromMs != null && ms < fromMs) return false;
  if (toMs != null && ms > toMs) return false;
  return true;
}

export function composeMarketingCampaignRecipientExplorer(input: {
  organizationId: string;
  durableAvailable: boolean;
  campaignId?: string | null;
  recipients?: MarketingDurableSnapshotRecipientRecord[];
  ledger?: MarketingDurableLedgerRecord[];
  engagements?: MarketingDurableEngagementEventRecord[];
  durableSuppressions?: MarketingDurableSuppressionRecord[];
  consentRecords?: MarketingConsentSuppressionRecord[];
  durableQualifications?: MarketingDurableQualificationRecord[];
  qualifications?: MarketingQualificationRecord[];
  filters?: MarketingCampaignRecipientExplorerFilters;
  page?: number;
  pageSize?: number;
}): MarketingCampaignRecipientExplorerPage {
  const pageSize = Math.min(Math.max(1, input.pageSize ?? 50), 100);
  const page = Math.max(1, input.page ?? 1);
  const filters: MarketingCampaignRecipientExplorerFilters = input.filters ?? {};
  if (!input.durableAvailable) {
    return {
      rows: [],
      total: 0,
      page,
      pageSize,
      durableAvailable: false,
      notice: "Unavailable — durable recipient records are not connected.",
      filters,
    };
  }

  const ledgerByRecipient = new Map<string, MarketingDurableLedgerRecord>();
  for (const row of input.ledger ?? []) {
    if (row.organizationId !== input.organizationId) continue;
    ledgerByRecipient.set(row.snapshotRecipientId, row);
  }

  const campaignId = input.campaignId?.trim() || null;
  const mapped: MarketingCampaignRecipientExplorerRow[] = [];

  for (const recipient of input.recipients ?? []) {
    if (recipient.organizationId !== input.organizationId) continue;
    if (campaignId && recipient.campaignId !== campaignId) continue;
    const ledger = ledgerByRecipient.get(recipient.id) ?? null;
    const relatedEngagements = (input.engagements ?? []).filter(
      (event) =>
        event.organizationId === input.organizationId &&
        Boolean(ledger) &&
        event.ledgerId === ledger?.id,
    );
    const consentRecords = relatedByIdentity(input.consentRecords ?? [], recipient, ledger).filter(
      (row) => row.organizationId === input.organizationId,
    );
    const durableSuppressions = relatedByIdentity(
      input.durableSuppressions ?? [],
      recipient,
      ledger,
    ).filter((row) => row.organizationId === input.organizationId);
    const qualifications = relatedByIdentity(input.qualifications ?? [], recipient, ledger).filter(
      (row) => row.organizationId === input.organizationId && row.campaignId === recipient.campaignId,
    );
    const durableQualifications = relatedByIdentity(
      input.durableQualifications ?? [],
      recipient,
      ledger,
    ).filter((row) => row.organizationId === input.organizationId && row.campaignId === recipient.campaignId);

    const bounceCategory = classifyMarketingBounceCategory({
      ledger,
      engagements: relatedEngagements,
      durableSuppressions,
      consentRecords,
    });
    const unsubscribed = marketingRecipientIsUnsubscribed({
      ledger,
      engagements: relatedEngagements,
      consentRecords,
    });
    const complaint = marketingRecipientHasComplaint({
      ledger,
      engagements: relatedEngagements,
      consentRecords,
    });
    const permanentlySuppressed = marketingRecipientIsPermanentlySuppressed({
      ledger,
      durableSuppressions,
      consentRecords,
    });
    const suppressed = marketingRecipientIsSuppressed({
      ledger,
      durableSuppressions,
      consentRecords,
    });
    const qualified = marketingRecipientIsQualified({ durableQualifications, qualifications });
    const qualificationId = qualifications[0]?.id ?? durableQualifications[0]?.id ?? null;
    const retry = evaluateMarketingMonitoringRetry({
      status: ledger?.status ?? "snapshotted",
      attemptCount: ledger?.attemptCount ?? 0,
      bounceCategory,
      unsubscribed,
      complaint,
      permanentlySuppressed,
    });
    const actions = resolveMarketingMonitoringNextAction({
      retryAllowed: retry.allowed,
      suppressed,
      hasSuppressionHistory: consentRecords.length > 0 || durableSuppressions.length > 0,
      qualificationId,
    });
    const flags = marketingEngagementFlags(relatedEngagements, ledger);
    const latest = latestEventLabel({ ledger, engagements: relatedEngagements });
    const attemptCount = ledger?.attemptCount ?? 0;
    const status = ledger?.status ?? "snapshotted";

    mapped.push({
      id: recipient.id,
      organizationId: recipient.organizationId,
      campaignId: recipient.campaignId,
      snapshotId: recipient.snapshotId,
      ledgerId: ledger?.id ?? null,
      identityPreview: maskMarketingRecipientEmail(recipient.normalizedEmail),
      fingerprintPreview: redactMarketingFingerprint(recipient.recipientFingerprint),
      sourceKey: maskMarketingSourceKey(recipient.sourceStableKey),
      batchNumber: ledger?.batchNumber ?? recipient.assignedBatchNumber,
      status,
      latestEvent: latest.label,
      latestEventAt: latest.at,
      attemptCount,
      failureCategory: classifyMarketingFailureCategory({
        status,
        attemptCount,
        bounceCategory,
        unsubscribed,
        complaint,
        permanentlySuppressed,
      }),
      bounceCategory,
      nextPermittedAction: actions.next,
      retryBlockedReason: retry.reason,
      allowedActions: actions.allowed,
      qualificationId,
      suppressed,
    });

    const last = mapped[mapped.length - 1];
    const deliveryState = filters.deliveryState ?? "all";
    if (deliveryState && deliveryState !== "all" && last.status !== deliveryState) {
      mapped.pop();
      continue;
    }
    const batch = filters.batch ?? "all";
    if (batch !== "all" && batch != null && last.batchNumber !== batch) {
      mapped.pop();
      continue;
    }
    const attempt = filters.attempt ?? "all";
    if (attempt === "zero" && last.attemptCount !== 0) {
      mapped.pop();
      continue;
    }
    if (attempt === "one_or_more" && last.attemptCount < 1) {
      mapped.pop();
      continue;
    }
    if (attempt === "maxed" && last.attemptCount < MARKETING_RETRY_MAX_ATTEMPTS) {
      mapped.pop();
      continue;
    }
    const bounceFilter = filters.bounceCategory ?? "all";
    if (bounceFilter === "none" && last.bounceCategory != null) {
      mapped.pop();
      continue;
    }
    if ((bounceFilter === "soft" || bounceFilter === "hard") && last.bounceCategory !== bounceFilter) {
      mapped.pop();
      continue;
    }
    const engagement = filters.engagement ?? "all";
    if (engagement === "opened" && !flags.opened) {
      mapped.pop();
      continue;
    }
    if (engagement === "clicked" && !flags.clicked) {
      mapped.pop();
      continue;
    }
    if (engagement === "replied" && !flags.replied) {
      mapped.pop();
      continue;
    }
    if (engagement === "none" && (flags.opened || flags.clicked || flags.replied)) {
      mapped.pop();
      continue;
    }
    const suppression = filters.suppression ?? "all";
    if (suppression === "yes" && !last.suppressed) {
      mapped.pop();
      continue;
    }
    if (suppression === "no" && last.suppressed) {
      mapped.pop();
      continue;
    }
    const qualification = filters.qualification ?? "all";
    if (qualification === "qualified" && !qualified) {
      mapped.pop();
      continue;
    }
    if (qualification === "not_qualified" && qualified) {
      mapped.pop();
      continue;
    }
    if (!inRange(last.latestEventAt, filters.from, filters.to)) {
      mapped.pop();
    }
  }

  const total = mapped.length;
  const start = (page - 1) * pageSize;
  return {
    rows: mapped.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    durableAvailable: true,
    notice: MARKETING_CAMPAIGN_MONITORING_NOTICE,
    filters,
  };
}
