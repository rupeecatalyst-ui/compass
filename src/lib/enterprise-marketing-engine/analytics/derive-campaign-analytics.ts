/**
 * CO-MARKETING-MKT-10 — Single SSOT calculator for marketing campaign analytics.
 * Consumes ledger + engagement events + campaign/audience/binding config refs.
 * Does not copy audience source rows. Does not invent unsupported provider metrics.
 */

import type { MarketingCampaignStatus, MarketingChannel } from "@/constants/enterprise-marketing-engine";
import { MARKETING_CAMPAIGN_STATUSES } from "@/constants/enterprise-marketing-engine";
import { MARKETING_ANALYTICS_NOTICE } from "@/constants/enterprise-marketing-engine/analytics";
import type { MarketingAudienceDefinition } from "@/types/enterprise-marketing-audience";
import type { MarketingCampaign } from "@/types/enterprise-marketing-campaign";
import type { MarketingDataSourceBinding } from "@/types/enterprise-marketing-data-source";
import type {
  MarketingBatchExecutionRecord,
  MarketingRecipientLedgerEntry,
  MarketingRecipientLedgerStatus,
} from "@/types/enterprise-marketing-execution";
import type { MarketingSuppressionRecord } from "@/types/enterprise-marketing-audience";
import type {
  MarketingAnalyticsDashboard,
  MarketingAnalyticsTimeRange,
  MarketingCampaignAnalyticsRow,
  MarketingCampaignStatusCounts,
  MarketingChannelAnalysisRow,
  MarketingChannelEventCapability,
  MarketingEngagementEvent,
  MarketingEngagementEventType,
  MarketingFunnelStage,
  MarketingMetricValue,
  MarketingQualificationRecord,
  MarketingSourceAnalysisRow,
} from "@/types/enterprise-marketing-analytics";
import { MARKETING_ENGAGEMENT_EVENT_TYPES } from "@/types/enterprise-marketing-analytics";
import { isTimestampInRange } from "./time-range";
import { redactMarketingFingerprint } from "./redact-fingerprint";

const EMPTY_LEDGER: Record<MarketingRecipientLedgerStatus, number> = {
  eligible: 0,
  queued: 0,
  processing: 0,
  processed: 0,
  delivered: 0,
  failed: 0,
  skipped: 0,
  suppressed: 0,
};

const PROCESSED_STATUSES = new Set<MarketingRecipientLedgerStatus>([
  "processed",
  "delivered",
  "failed",
  "skipped",
  "suppressed",
]);

function emptyStatusCounts(): MarketingCampaignStatusCounts {
  const counts = { total: 0 } as MarketingCampaignStatusCounts;
  for (const s of MARKETING_CAMPAIGN_STATUSES) counts[s] = 0;
  return counts;
}

function emptyLedgerCounts(): Record<MarketingRecipientLedgerStatus, number> {
  return { ...EMPTY_LEDGER };
}

function metric(
  supported: boolean,
  value: number,
  unavailableReason: string,
): MarketingMetricValue {
  if (supported) {
    return { availability: "available", value, reason: null };
  }
  if (value > 0) {
    return {
      availability: "ingested",
      value,
      reason: "Recorded events exist; the current provider mode does not emit this type.",
    };
  }
  return { availability: "unavailable", value: null, reason: unavailableReason };
}

function capabilityFor(
  capabilities: MarketingChannelEventCapability[],
  channel: MarketingChannel,
): MarketingChannelEventCapability | undefined {
  return capabilities.find((c) => c.channel === channel);
}

function eventSupported(
  capabilities: MarketingChannelEventCapability[],
  channels: MarketingChannel[],
  type: MarketingEngagementEventType,
): boolean {
  if (channels.length === 0) {
    return capabilities.some((c) => c.supported[type]);
  }
  return channels.some((ch) => capabilityFor(capabilities, ch)?.supported[type] === true);
}

function unsupportedReason(
  capabilities: MarketingChannelEventCapability[],
  channels: MarketingChannel[],
  type: MarketingEngagementEventType,
): string {
  for (const ch of channels.length ? channels : (["EMAIL", "WHATSAPP", "DIGITAL"] as MarketingChannel[])) {
    const cap = capabilityFor(capabilities, ch);
    const note = cap?.notes[type];
    if (note) return note;
  }
  return "This event is not supported by the current provider mode.";
}

function countEvents(
  events: MarketingEngagementEvent[],
  type: MarketingEngagementEventType,
  campaignId?: string,
  channel?: MarketingChannel,
): number {
  let n = 0;
  for (const e of events) {
    if (e.type !== type) continue;
    if (campaignId && e.campaignId !== campaignId) continue;
    if (channel && e.channel !== channel) continue;
    n += 1;
  }
  return n;
}

function uniqueChannels(campaigns: MarketingCampaign[]): MarketingChannel[] {
  return [...new Set(campaigns.map((c) => c.channel))];
}

function buildFunnel(input: {
  audienceEstimate: number | null;
  processed: number;
  sent: MarketingMetricValue;
  delivered: MarketingMetricValue;
  opened: MarketingMetricValue;
  clicked: MarketingMetricValue;
  replied: MarketingMetricValue;
  qualified: MarketingMetricValue;
  handoff: MarketingMetricValue;
}): MarketingFunnelStage[] {
  return [
    {
      id: "audience",
      label: "Audience (estimate)",
      metric:
        input.audienceEstimate == null
          ? {
              availability: "unavailable",
              value: null,
              reason: "No external-source audience estimate available for this selection.",
            }
          : { availability: "available", value: input.audienceEstimate, reason: null },
    },
    {
      id: "processed",
      label: "Processed",
      metric: { availability: "available", value: input.processed, reason: null },
    },
    { id: "sent", label: "Sent", metric: input.sent },
    { id: "delivered", label: "Delivered", metric: input.delivered },
    { id: "opened", label: "Opened", metric: input.opened },
    { id: "clicked", label: "Clicked", metric: input.clicked },
    { id: "replied", label: "Replied", metric: input.replied },
    { id: "qualified", label: "Qualified", metric: input.qualified },
    { id: "handoff", label: "Opportunity / Handoff", metric: input.handoff },
  ];
}

export function deriveMarketingCampaignAnalytics(input: {
  now?: Date;
  range: MarketingAnalyticsTimeRange;
  campaigns: MarketingCampaign[];
  audiences: MarketingAudienceDefinition[];
  bindings: MarketingDataSourceBinding[];
  ledger: MarketingRecipientLedgerEntry[];
  batches: MarketingBatchExecutionRecord[];
  events: MarketingEngagementEvent[];
  suppressions: MarketingSuppressionRecord[];
  qualifications: MarketingQualificationRecord[];
  channelCapabilities: MarketingChannelEventCapability[];
  handoffEnabled: boolean;
  /** External-source estimates keyed by audienceId — never a mirrored row store. */
  audienceEstimates?: Record<string, number | null>;
}): MarketingAnalyticsDashboard {
  const generatedAt = (input.now ?? new Date()).toISOString();
  const audienceById = new Map(input.audiences.map((a) => [a.id, a]));
  const bindingById = new Map(input.bindings.map((b) => [b.id, b]));
  const campaignById = new Map(input.campaigns.map((c) => [c.id, c]));
  const estimates = input.audienceEstimates ?? {};

  const eventsInRange = input.events.filter((e) => isTimestampInRange(e.occurredAt, input.range));
  const ledgerInRange = input.ledger.filter((e) =>
    isTimestampInRange(e.processedAt ?? e.updatedAt, input.range),
  );
  const batchesInRange = input.batches.filter((b) => isTimestampInRange(b.startedAt, input.range));
  const suppressionsInRange = input.suppressions.filter((s) =>
    isTimestampInRange(s.createdAt, input.range),
  );

  const statusCounts = emptyStatusCounts();
  for (const c of input.campaigns) {
    statusCounts[c.status] += 1;
    statusCounts.total += 1;
  }

  const channels = uniqueChannels(input.campaigns);
  const caps = input.channelCapabilities;

  const recipientsProcessed = ledgerInRange.filter((e) => PROCESSED_STATUSES.has(e.status)).length;
  const ledgerFailed = ledgerInRange.filter((e) => e.status === "failed").length;
  const ledgerSuppressed = ledgerInRange.filter((e) => e.status === "suppressed").length;
  const sentEvents = countEvents(eventsInRange, "SENT");
  const failedEvents = countEvents(eventsInRange, "FAILED");
  const deliveredEvents = countEvents(eventsInRange, "DELIVERED");
  const openedEvents = countEvents(eventsInRange, "OPENED");
  const clickedEvents = countEvents(eventsInRange, "CLICKED");
  const repliedEvents = countEvents(eventsInRange, "REPLIED");
  const unsubEvents = countEvents(eventsInRange, "UNSUBSCRIBED");
  const bouncedEvents = countEvents(eventsInRange, "BOUNCED");
  const suppressedEvents = countEvents(eventsInRange, "SUPPRESSED");
  const qualifiedEvents = countEvents(eventsInRange, "QUALIFIED");
  const handedOffEvents = countEvents(eventsInRange, "HANDED_OFF");

  const unsubFromSuppression = suppressionsInRange.filter((s) => s.reason === "UNSUBSCRIBE").length;
  const unsubscribedCount = unsubEvents + unsubFromSuppression;
  const suppressedCount = Math.max(ledgerSuppressed, suppressedEvents);
  const failedCount = Math.max(ledgerFailed, failedEvents);

  const qualifiedRecords = input.qualifications.filter((q) =>
    isTimestampInRange(q.createdAt, input.range),
  );
  const qualifiedCount = Math.max(
    qualifiedEvents,
    qualifiedRecords.filter((q) => q.businessState === "QUALIFIED" || q.businessState === "HANDED_OFF")
      .length,
  );
  const handoffCount = input.handoffEnabled
    ? Math.max(
        handedOffEvents,
        qualifiedRecords.filter((q) => q.businessState === "HANDED_OFF" && q.opportunityId).length,
      )
    : 0;

  const audienceEstimateSum = (() => {
    let sum = 0;
    let any = false;
    const seen = new Set<string>();
    for (const c of input.campaigns) {
      if (!c.audienceId || seen.has(c.audienceId)) continue;
      seen.add(c.audienceId);
      const v = estimates[c.audienceId];
      if (typeof v === "number" && Number.isFinite(v)) {
        sum += v;
        any = true;
      }
    }
    return any ? sum : null;
  })();

  const sentMetric = metric(eventSupported(caps, channels, "SENT"), sentEvents, unsupportedReason(caps, channels, "SENT"));
  const failedMetric = metric(
    eventSupported(caps, channels, "FAILED"),
    failedCount,
    unsupportedReason(caps, channels, "FAILED"),
  );
  const deliveredMetric = metric(
    eventSupported(caps, channels, "DELIVERED"),
    deliveredEvents,
    unsupportedReason(caps, channels, "DELIVERED"),
  );
  const openedMetric = metric(
    eventSupported(caps, channels, "OPENED"),
    openedEvents,
    unsupportedReason(caps, channels, "OPENED"),
  );
  const clickedMetric = metric(
    eventSupported(caps, channels, "CLICKED"),
    clickedEvents,
    unsupportedReason(caps, channels, "CLICKED"),
  );
  const repliedMetric = metric(
    eventSupported(caps, channels, "REPLIED"),
    repliedEvents,
    unsupportedReason(caps, channels, "REPLIED"),
  );
  const bouncedMetric = metric(
    eventSupported(caps, channels, "BOUNCED"),
    bouncedEvents,
    unsupportedReason(caps, channels, "BOUNCED"),
  );
  const unsubscribedMetric = metric(
    eventSupported(caps, channels, "UNSUBSCRIBED"),
    unsubscribedCount,
    unsupportedReason(caps, channels, "UNSUBSCRIBED"),
  );
  const suppressionMetric = metric(
    eventSupported(caps, channels, "SUPPRESSED"),
    suppressedCount,
    unsupportedReason(caps, channels, "SUPPRESSED"),
  );
  const qualifiedMetric = metric(
    input.handoffEnabled || eventSupported(caps, channels, "QUALIFIED"),
    qualifiedCount,
    unsupportedReason(caps, channels, "QUALIFIED"),
  );
  const handoffMetric = metric(
    input.handoffEnabled,
    handoffCount,
    "Operational handoff is disabled — Opportunity counts are not invented.",
  );

  const commandCenter = {
    campaigns: statusCounts.total,
    scheduled: statusCounts.SCHEDULED,
    running: statusCounts.RUNNING,
    paused: statusCounts.PAUSED,
    completed: statusCounts.COMPLETED,
    recipientsProcessed,
    audienceEstimate: audienceEstimateSum,
    sent: sentMetric,
    failed: failedMetric,
    delivered: deliveredMetric,
    opened: openedMetric,
    clicked: clickedMetric,
    replied: repliedMetric,
    bounced: bouncedMetric,
    unsubscribed: unsubscribedMetric,
    suppression: suppressionMetric,
    qualifiedResponses: qualifiedMetric,
    handoffOpportunities: handoffMetric,
  };

  const funnel = buildFunnel({
    audienceEstimate: audienceEstimateSum,
    processed: recipientsProcessed,
    sent: sentMetric,
    delivered: deliveredMetric,
    opened: openedMetric,
    clicked: clickedMetric,
    replied: repliedMetric,
    qualified: qualifiedMetric,
    handoff: handoffMetric,
  });

  const campaigns: MarketingCampaignAnalyticsRow[] = input.campaigns.map((campaign) => {
    const audience = campaign.audienceId ? audienceById.get(campaign.audienceId) ?? null : null;
    const binding = audience ? bindingById.get(audience.bindingId) ?? null : null;
    const cap = capabilityFor(caps, campaign.channel);
    const ch = [campaign.channel];
    const campLedger = ledgerInRange.filter((e) => e.campaignId === campaign.id);
    const campBatches = batchesInRange.filter((b) => b.campaignId === campaign.id);
    const ledgerCounts = emptyLedgerCounts();
    for (const e of campLedger) ledgerCounts[e.status] += 1;
    const processed = campLedger.filter((e) => PROCESSED_STATUSES.has(e.status)).length;
    const lastBatchAt =
      campBatches.length === 0
        ? null
        : campBatches.reduce((acc, b) => (b.startedAt > acc ? b.startedAt : acc), campBatches[0]!.startedAt);

    const audienceEstimate =
      campaign.audienceId && typeof estimates[campaign.audienceId] === "number"
        ? estimates[campaign.audienceId]!
        : null;
    const progressPercent =
      audienceEstimate && audienceEstimate > 0
        ? Math.min(100, Math.round((processed / audienceEstimate) * 1000) / 10)
        : null;

    const sent = countEvents(eventsInRange, "SENT", campaign.id);
    const failed = Math.max(
      campLedger.filter((e) => e.status === "failed").length,
      countEvents(eventsInRange, "FAILED", campaign.id),
    );
    const delivered = countEvents(eventsInRange, "DELIVERED", campaign.id);
    const opened = countEvents(eventsInRange, "OPENED", campaign.id);
    const clicked = countEvents(eventsInRange, "CLICKED", campaign.id);
    const replied = countEvents(eventsInRange, "REPLIED", campaign.id);
    const unsubscribed = countEvents(eventsInRange, "UNSUBSCRIBED", campaign.id);
    const bounced = countEvents(eventsInRange, "BOUNCED", campaign.id);
    const suppressed = Math.max(
      campLedger.filter((e) => e.status === "suppressed").length,
      countEvents(eventsInRange, "SUPPRESSED", campaign.id),
    );
    const qualified = Math.max(
      countEvents(eventsInRange, "QUALIFIED", campaign.id),
      qualifiedRecords.filter(
        (q) =>
          q.campaignId === campaign.id &&
          (q.businessState === "QUALIFIED" || q.businessState === "HANDED_OFF"),
      ).length,
    );
    const handoff = input.handoffEnabled
      ? Math.max(
          countEvents(eventsInRange, "HANDED_OFF", campaign.id),
          qualifiedRecords.filter(
            (q) => q.campaignId === campaign.id && q.businessState === "HANDED_OFF" && q.opportunityId,
          ).length,
        )
      : 0;

    const note = (type: MarketingEngagementEventType) =>
      cap?.notes[type] ?? unsupportedReason(caps, ch, type);

    const sentM = metric(cap?.supported.SENT === true, sent, note("SENT"));
    const failedM = metric(cap?.supported.FAILED === true, failed, note("FAILED"));
    const deliveredM = metric(cap?.supported.DELIVERED === true, delivered, note("DELIVERED"));
    const openedM = metric(cap?.supported.OPENED === true, opened, note("OPENED"));
    const clickedM = metric(cap?.supported.CLICKED === true, clicked, note("CLICKED"));
    const repliedM = metric(cap?.supported.REPLIED === true, replied, note("REPLIED"));
    const unsubM = metric(cap?.supported.UNSUBSCRIBED === true, unsubscribed, note("UNSUBSCRIBED"));
    const bouncedM = metric(cap?.supported.BOUNCED === true, bounced, note("BOUNCED"));
    const suppressedM = metric(cap?.supported.SUPPRESSED === true, suppressed, note("SUPPRESSED"));
    const qualifiedM = metric(
      input.handoffEnabled || cap?.supported.QUALIFIED === true,
      qualified,
      note("QUALIFIED"),
    );
    const handoffM = metric(
      input.handoffEnabled,
      handoff,
      "Operational handoff is disabled — Opportunity counts are not invented.",
    );

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      channel: campaign.channel,
      audienceId: audience?.id ?? campaign.audienceId ?? null,
      audienceName: audience?.name ?? null,
      audienceEstimate,
      sourceBindingId: binding?.id ?? audience?.bindingId ?? null,
      sourceBindingName: binding?.displayName ?? null,
      sourceDatasetId: audience?.datasetId ?? null,
      sourceDatasetName: audience?.datasetDisplayName ?? audience?.datasetId ?? null,
      recipientsProcessed: processed,
      progressPercent,
      ledgerCounts,
      batchCount: campBatches.length,
      lastBatchAt,
      sent: sentM,
      failed: failedM,
      delivered: deliveredM,
      opened: openedM,
      clicked: clickedM,
      replied: repliedM,
      unsubscribed: unsubM,
      bounced: bouncedM,
      suppressed: suppressedM,
      qualified: qualifiedM,
      handoffOpportunities: handoffM,
      funnel: buildFunnel({
        audienceEstimate,
        processed,
        sent: sentM,
        delivered: deliveredM,
        opened: openedM,
        clicked: clickedM,
        replied: repliedM,
        qualified: qualifiedM,
        handoff: handoffM,
      }),
    };
  });

  const sourceAnalysis = buildSourceAnalysis(campaigns);
  const channelAnalysis = buildChannelAnalysis(campaigns, caps);

  const engagement = eventsInRange
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 200)
    .map((e) => ({
      id: e.id,
      campaignId: e.campaignId,
      campaignName: campaignById.get(e.campaignId)?.name ?? e.campaignId,
      channel: e.channel,
      type: e.type,
      occurredAt: e.occurredAt,
      fingerprintPreview: redactMarketingFingerprint(e.recipientFingerprint),
      errorCode: e.errorCode ?? null,
    }));

  return {
    sprint: "CO-MARKETING-MKT-10",
    generatedAt,
    range: input.range,
    notice: MARKETING_ANALYTICS_NOTICE,
    statusCounts,
    commandCenter,
    funnel,
    campaigns,
    sourceAnalysis,
    channelAnalysis,
    channelCapabilities: caps,
    engagement,
  };
}

function buildSourceAnalysis(rows: MarketingCampaignAnalyticsRow[]): MarketingSourceAnalysisRow[] {
  type Acc = {
    dimension: MarketingSourceAnalysisRow["dimension"];
    key: string;
    label: string;
    campaignIds: Set<string>;
    recipientsProcessed: number;
    sent: number;
    failed: number;
    suppressed: number;
  };

  const buckets = new Map<string, Acc>();

  const add = (
    dimension: MarketingSourceAnalysisRow["dimension"],
    key: string,
    label: string,
    row: MarketingCampaignAnalyticsRow,
  ) => {
    const id = `${dimension}:${key}`;
    let acc = buckets.get(id);
    if (!acc) {
      acc = {
        dimension,
        key,
        label,
        campaignIds: new Set(),
        recipientsProcessed: 0,
        sent: 0,
        failed: 0,
        suppressed: 0,
      };
      buckets.set(id, acc);
    }
    acc.campaignIds.add(row.campaignId);
    acc.recipientsProcessed += row.recipientsProcessed;
    acc.sent += row.sent.value ?? 0;
    acc.failed += row.failed.value ?? 0;
    acc.suppressed += row.suppressed.value ?? 0;
  };

  for (const row of rows) {
    add("campaign", row.campaignId, row.name, row);
    add("channel", row.channel, row.channel, row);
    add(
      "audience",
      row.audienceId ?? "unassigned",
      row.audienceName ?? "Unassigned audience",
      row,
    );
    add(
      "google_sheet",
      row.sourceBindingId ?? "unassigned",
      row.sourceBindingName ?? "Unassigned Google Sheet",
      row,
    );
    add(
      "sheet_tab",
      row.sourceDatasetId ? `${row.sourceBindingId ?? "none"}:${row.sourceDatasetId}` : "unassigned",
      row.sourceDatasetName ?? "Unassigned sheet / tab",
      row,
    );
  }

  return [...buckets.values()]
    .map((a) => ({
      dimension: a.dimension,
      key: a.key,
      label: a.label,
      campaignCount: a.campaignIds.size,
      recipientsProcessed: a.recipientsProcessed,
      sent: a.sent,
      failed: a.failed,
      suppressed: a.suppressed,
    }))
    .sort((a, b) => a.dimension.localeCompare(b.dimension) || b.sent - a.sent);
}

function buildChannelAnalysis(
  rows: MarketingCampaignAnalyticsRow[],
  caps: MarketingChannelEventCapability[],
): MarketingChannelAnalysisRow[] {
  const byChannel = new Map<MarketingChannel, MarketingCampaignAnalyticsRow[]>();
  for (const row of rows) {
    const list = byChannel.get(row.channel) ?? [];
    list.push(row);
    byChannel.set(row.channel, list);
  }

  const out: MarketingChannelAnalysisRow[] = [];
  for (const [channel, list] of byChannel) {
    const cap = capabilityFor(caps, channel);
    const note = (type: MarketingEngagementEventType) =>
      cap?.notes[type] ?? "This event is not supported by the current provider mode.";
    const sum = (pick: (r: MarketingCampaignAnalyticsRow) => MarketingMetricValue) =>
      list.reduce((n, r) => n + (pick(r).value ?? 0), 0);
    out.push({
      channel,
      mode: cap?.mode ?? "disabled",
      campaignCount: list.length,
      recipientsProcessed: list.reduce((n, r) => n + r.recipientsProcessed, 0),
      sent: metric(cap?.supported.SENT === true, sum((r) => r.sent), note("SENT")),
      failed: metric(cap?.supported.FAILED === true, sum((r) => r.failed), note("FAILED")),
      delivered: metric(cap?.supported.DELIVERED === true, sum((r) => r.delivered), note("DELIVERED")),
      opened: metric(cap?.supported.OPENED === true, sum((r) => r.opened), note("OPENED")),
      clicked: metric(cap?.supported.CLICKED === true, sum((r) => r.clicked), note("CLICKED")),
      suppressed: metric(cap?.supported.SUPPRESSED === true, sum((r) => r.suppressed), note("SUPPRESSED")),
    });
  }
  return out.sort((a, b) => a.channel.localeCompare(b.channel));
}

export function assertAnalyticsDoesNotInventUnsupportedZeros(dashboard: MarketingAnalyticsDashboard): void {
  const check = (m: MarketingMetricValue, label: string) => {
    if (m.availability === "unavailable" && m.value !== null) {
      throw new Error(`${label} marked unavailable but has a numeric value`);
    }
    if (m.availability === "unavailable" && m.value === 0) {
      throw new Error(`${label} must not present invented zero as an available metric`);
    }
  };
  check(dashboard.commandCenter.delivered, "delivered");
  check(dashboard.commandCenter.opened, "opened");
  check(dashboard.commandCenter.clicked, "clicked");
  check(dashboard.commandCenter.replied, "replied");
  check(dashboard.commandCenter.bounced, "bounced");
  for (const stage of dashboard.funnel) {
    if (stage.id === "delivered" || stage.id === "opened" || stage.id === "clicked" || stage.id === "replied") {
      check(stage.metric, `funnel.${stage.id}`);
    }
  }
  for (const t of MARKETING_ENGAGEMENT_EVENT_TYPES) {
    void t;
  }
}

export { redactMarketingFingerprint };
