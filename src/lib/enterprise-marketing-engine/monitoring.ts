/**
 * CO-MARKETING-REDESIGN-010 — Compose monitoring metrics from durable records.
 * Where no provider or durable store exists: Unavailable / Not connected. Never fabricate.
 */

import {
  availableMarketingMetric,
  unavailableMarketingMetric,
} from "@/lib/enterprise-marketing-engine/home-overview";
import { MARKETING_MONITORING_NOTICE } from "@/constants/enterprise-marketing-engine/monitoring";
import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type {
  MarketingDurableAudienceSnapshotRecord,
  MarketingDurableEngagementEventRecord,
  MarketingDurableLedgerRecord,
  MarketingDurableQualificationRecord,
  MarketingDurableSnapshotRecipientRecord,
  MarketingDurableSuppressionRecord,
  MarketingDurableTestSendRecord,
} from "@/types/enterprise-marketing-durability";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import type {
  MarketingMonitoringDashboard,
  MarketingMonitoringMetricKey,
} from "@/types/enterprise-marketing-monitoring";

export type MarketingMonitoringComposeInput = {
  organizationId: string;
  durableAvailable: boolean;
  providerConnected: boolean;
  generatedAt?: string;
  snapshots?: MarketingDurableAudienceSnapshotRecord[];
  snapshotRecipients?: MarketingDurableSnapshotRecipientRecord[];
  ledger?: MarketingDurableLedgerRecord[];
  engagements?: MarketingDurableEngagementEventRecord[];
  suppressions?: MarketingDurableSuppressionRecord[];
  testSends?: MarketingDurableTestSendRecord[];
  durableQualifications?: MarketingDurableQualificationRecord[];
  qualifications?: MarketingQualificationRecord[];
  attributedPipelineValue?: number | null;
  attributedRevenueValue?: number | null;
};

function durableCount(
  durableAvailable: boolean,
  value: number,
): MarketingMetricValue {
  if (!durableAvailable) return unavailableMarketingMetric("Unavailable");
  return availableMarketingMetric(value);
}

function providerOrIngested(input: {
  providerConnected: boolean;
  durableAvailable: boolean;
  ingested: number;
}): MarketingMetricValue {
  if (input.ingested > 0) {
    return {
      availability: "ingested",
      value: input.ingested,
      reason: "Durable ledger / engagement timestamps",
    };
  }
  if (!input.providerConnected) return unavailableMarketingMetric("Not connected");
  if (!input.durableAvailable) return unavailableMarketingMetric("Unavailable");
  return availableMarketingMetric(0);
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

function sumDefined(values: Array<number | undefined | null>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0);
}

function eventType(row: MarketingDurableEngagementEventRecord): string {
  return (row.eventType ?? "").toUpperCase();
}

export function composeMarketingMonitoringDashboard(
  input: MarketingMonitoringComposeInput,
): MarketingMonitoringDashboard {
  const snapshots = (input.snapshots ?? []).filter((row) => row.organizationId === input.organizationId);
  const recipients = (input.snapshotRecipients ?? []).filter(
    (row) => row.organizationId === input.organizationId,
  );
  const ledger = (input.ledger ?? []).filter((row) => row.organizationId === input.organizationId);
  const engagements = (input.engagements ?? []).filter(
    (row) => row.organizationId === input.organizationId,
  );
  const suppressions = (input.suppressions ?? []).filter(
    (row) => row.organizationId === input.organizationId,
  );
  const testSends = (input.testSends ?? []).filter((row) => row.organizationId === input.organizationId);
  const durableQualifications = (input.durableQualifications ?? []).filter(
    (row) => row.organizationId === input.organizationId,
  );
  const qualifications = (input.qualifications ?? []).filter(
    (row) => row.organizationId === input.organizationId,
  );
  const latest = latestSnapshotsByCampaign(snapshots);

  const sourceRowSum = sumDefined(latest.map((row) => row.sourceRowCount));
  const eligibleSum = sumDefined(latest.map((row) => row.eligibleCount));

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
  const simulatedSent =
    ledger.filter((row) => row.status === "sent").length + testSends.length;
  const deliveredLedger = ledger.filter((row) => row.status === "delivered").length;
  const deferred = ledger.filter((row) => row.status === "deferred").length;
  const bouncedLedger = ledger.filter((row) => row.status === "bounced").length;
  const failed = ledger.filter((row) => row.status === "failed").length;
  const openedIngested =
    ledger.filter((row) => Boolean(row.openedAt)).length +
    engagements.filter((row) => eventType(row) === "OPENED" || eventType(row) === "OPEN").length;
  const clickedIngested =
    ledger.filter((row) => Boolean(row.clickedAt)).length +
    engagements.filter((row) => eventType(row) === "CLICKED" || eventType(row) === "CLICK").length;
  const repliedIngested =
    ledger.filter((row) => Boolean(row.repliedAt)).length +
    engagements.filter((row) => eventType(row) === "REPLIED" || eventType(row) === "REPLY").length;
  const unsubscribed =
    ledger.filter((row) => Boolean(row.unsubscribedAt)).length +
    suppressions.filter((row) => (row.reason ?? "").toUpperCase().includes("UNSUBSCRIBE")).length;
  const suppressed =
    ledger.filter((row) => row.status === "suppressed").length + suppressions.length;

  const qualifiedInbox = qualifications.filter(
    (row) => row.businessState === "QUALIFIED" || row.businessState === "HANDED_OFF",
  );
  const qualifiedDurable = durableQualifications.filter(
    (row) => Boolean(row.linkedContactId) || Boolean(row.linkedOpportunityId) || row.contactCreated || row.opportunityCreated,
  );
  const handedOff = qualifications.filter((row) => row.businessState === "HANDED_OFF");
  const contactCreated =
    handedOff.filter((row) => row.contactCreated === true).length +
    durableQualifications.filter((row) => row.contactCreated === true).length;
  const contactReused =
    handedOff.filter((row) => Boolean(row.contactId) && row.contactCreated === false).length +
    durableQualifications.filter((row) => Boolean(row.linkedContactId) && row.contactCreated === false).length;
  const opportunityCreated =
    handedOff.filter((row) => row.opportunityCreated === true).length +
    durableQualifications.filter((row) => row.opportunityCreated === true).length;

  const metrics: Record<MarketingMonitoringMetricKey, MarketingMetricValue> = {
    sourceRows:
      !input.durableAvailable
        ? unavailableMarketingMetric("Unavailable")
        : sourceRowSum == null && latest.length > 0
          ? unavailableMarketingMetric("Unavailable")
          : availableMarketingMetric(sourceRowSum ?? 0),
    eligible:
      !input.durableAvailable
        ? unavailableMarketingMetric("Unavailable")
        : eligibleSum == null && latest.length > 0
          ? unavailableMarketingMetric("Unavailable")
          : availableMarketingMetric(eligibleSum ?? 0),
    snapshotted: durableCount(input.durableAvailable, recipients.length),
    queued: durableCount(input.durableAvailable, queued),
    attempted: durableCount(input.durableAvailable, attempted),
    simulatedSent: durableCount(input.durableAvailable, simulatedSent),
    delivered: providerOrIngested({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: deliveredLedger,
    }),
    deferred: durableCount(input.durableAvailable, deferred),
    bounced: providerOrIngested({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: bouncedLedger,
    }),
    failed: durableCount(input.durableAvailable, failed),
    opened: providerOrIngested({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: openedIngested,
    }),
    clicked: providerOrIngested({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: clickedIngested,
    }),
    replied: providerOrIngested({
      providerConnected: input.providerConnected,
      durableAvailable: input.durableAvailable,
      ingested: repliedIngested,
    }),
    unsubscribed: durableCount(input.durableAvailable, unsubscribed),
    suppressed: durableCount(input.durableAvailable, suppressed),
    qualified: availableMarketingMetric(
      qualifications.length > 0 ? qualifiedInbox.length : qualifiedDurable.length,
    ),
    contactCreated: availableMarketingMetric(contactCreated),
    contactReused: availableMarketingMetric(contactReused),
    opportunityCreated: availableMarketingMetric(opportunityCreated),
    attributedPipeline:
      typeof input.attributedPipelineValue === "number"
        ? availableMarketingMetric(input.attributedPipelineValue)
        : unavailableMarketingMetric("Not connected"),
    attributedRevenue:
      typeof input.attributedRevenueValue === "number"
        ? availableMarketingMetric(input.attributedRevenueValue)
        : unavailableMarketingMetric("Not connected"),
  };

  return {
    sprint: "CO-MARKETING-REDESIGN-010",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    organizationId: input.organizationId,
    durableAvailable: input.durableAvailable,
    providerConnected: input.providerConnected,
    notice: MARKETING_MONITORING_NOTICE,
    metrics,
  };
}
