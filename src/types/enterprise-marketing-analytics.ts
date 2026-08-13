/**
 * CO-MARKETING-MKT-10 — Campaign analytics + engagement intelligence types.
 * Events and ledger only — never an audience-row mirror.
 */

import type { MarketingCampaignStatus, MarketingChannel } from "@/constants/enterprise-marketing-engine";
import type { MarketingRecipientLedgerStatus } from "@/types/enterprise-marketing-execution";

export const MARKETING_ENGAGEMENT_EVENT_TYPES = [
  "SENT",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "REPLIED",
  "UNSUBSCRIBED",
  "BOUNCED",
  "FAILED",
  "SUPPRESSED",
  "QUALIFIED",
  "HANDED_OFF",
] as const;

export type MarketingEngagementEventType = (typeof MARKETING_ENGAGEMENT_EVENT_TYPES)[number];

export const MARKETING_ANALYTICS_RANGE_PRESETS = [
  "today",
  "last_3_days",
  "last_7_days",
  "last_30_days",
  "custom",
] as const;

export type MarketingAnalyticsRangePreset = (typeof MARKETING_ANALYTICS_RANGE_PRESETS)[number];

export type MarketingAnalyticsTimeRange = {
  preset: MarketingAnalyticsRangePreset;
  from: string;
  to: string;
};

export type MarketingMetricAvailability = "available" | "unavailable" | "ingested";

/** Count when the provider supports the event; otherwise unavailable (never invented). */
export type MarketingMetricValue = {
  availability: MarketingMetricAvailability;
  value: number | null;
  reason: string | null;
};

export type MarketingEngagementEvent = {
  id: string;
  organizationId: string;
  campaignId: string;
  campaignVersionId?: string | null;
  channel: MarketingChannel;
  type: MarketingEngagementEventType;
  /** Identity hash only — never email, phone, or sheet row payload. */
  recipientFingerprint: string;
  occurredAt: string;
  recordedAt: string;
  providerEventId: string;
  idempotencyKey?: string | null;
  batchId?: string | null;
  /** Config refs for source analysis — not source rows. */
  sourceBindingId?: string | null;
  sourceDatasetId?: string | null;
  audienceId?: string | null;
  errorCode?: string | null;
};

import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
export type { MarketingQualificationRecord };

export type MarketingChannelEventCapability = {
  channel: MarketingChannel;
  mode: "off" | "dry_run" | "live" | "disabled";
  supported: Record<MarketingEngagementEventType, boolean>;
  notes: Partial<Record<MarketingEngagementEventType, string>>;
};

export type MarketingCampaignStatusCounts = Record<MarketingCampaignStatus, number> & {
  total: number;
};

export type MarketingFunnelStage = {
  id:
    | "audience"
    | "processed"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "replied"
    | "qualified"
    | "handoff";
  label: string;
  metric: MarketingMetricValue;
};

export type MarketingChannelAnalysisRow = {
  channel: MarketingChannel;
  mode: "off" | "dry_run" | "live" | "disabled";
  campaignCount: number;
  recipientsProcessed: number;
  sent: MarketingMetricValue;
  failed: MarketingMetricValue;
  delivered: MarketingMetricValue;
  opened: MarketingMetricValue;
  clicked: MarketingMetricValue;
  suppressed: MarketingMetricValue;
};

export type MarketingExecutionDrilldownRow = {
  id: string;
  campaignId: string;
  campaignName: string;
  channel: MarketingChannel;
  status: MarketingRecipientLedgerStatus;
  fingerprintPreview: string;
  batchId: string | null;
  processedAt: string | null;
  lastError: string | null;
};

export type MarketingCampaignAnalyticsRow = {
  campaignId: string;
  name: string;
  status: MarketingCampaignStatus;
  channel: MarketingChannel;
  audienceId: string | null;
  audienceName: string | null;
  /** External-source estimate only — never a mirrored row count in Supabase. */
  audienceEstimate: number | null;
  sourceBindingId: string | null;
  sourceBindingName: string | null;
  sourceDatasetId: string | null;
  sourceDatasetName: string | null;
  recipientsProcessed: number;
  progressPercent: number | null;
  ledgerCounts: Record<MarketingRecipientLedgerStatus, number>;
  batchCount: number;
  lastBatchAt: string | null;
  sent: MarketingMetricValue;
  failed: MarketingMetricValue;
  delivered: MarketingMetricValue;
  opened: MarketingMetricValue;
  clicked: MarketingMetricValue;
  replied: MarketingMetricValue;
  unsubscribed: MarketingMetricValue;
  bounced: MarketingMetricValue;
  suppressed: MarketingMetricValue;
  qualified: MarketingMetricValue;
  handoffOpportunities: MarketingMetricValue;
  funnel: MarketingFunnelStage[];
};

export type MarketingSourceAnalysisRow = {
  dimension: "google_sheet" | "sheet_tab" | "audience" | "campaign" | "channel";
  key: string;
  label: string;
  campaignCount: number;
  recipientsProcessed: number;
  sent: number;
  failed: number;
  suppressed: number;
};

export type MarketingEngagementExplorerRow = {
  id: string;
  campaignId: string;
  campaignName: string;
  channel: MarketingChannel;
  type: MarketingEngagementEventType;
  occurredAt: string;
  /** Redacted fingerprint only — never raw email/phone. */
  fingerprintPreview: string;
  errorCode: string | null;
};

export type MarketingAnalyticsDashboard = {
  sprint: "CO-MARKETING-MKT-10";
  generatedAt: string;
  range: MarketingAnalyticsTimeRange;
  notice: string;
  statusCounts: MarketingCampaignStatusCounts;
  commandCenter: {
    campaigns: number;
    scheduled: number;
    running: number;
    paused: number;
    completed: number;
    recipientsProcessed: number;
    audienceEstimate: number | null;
    sent: MarketingMetricValue;
    failed: MarketingMetricValue;
    delivered: MarketingMetricValue;
    opened: MarketingMetricValue;
    clicked: MarketingMetricValue;
    replied: MarketingMetricValue;
    bounced: MarketingMetricValue;
    unsubscribed: MarketingMetricValue;
    suppression: MarketingMetricValue;
    qualifiedResponses: MarketingMetricValue;
    handoffOpportunities: MarketingMetricValue;
  };
  funnel: MarketingFunnelStage[];
  campaigns: MarketingCampaignAnalyticsRow[];
  sourceAnalysis: MarketingSourceAnalysisRow[];
  channelAnalysis: MarketingChannelAnalysisRow[];
  channelCapabilities: MarketingChannelEventCapability[];
  engagement: MarketingEngagementExplorerRow[];
};
