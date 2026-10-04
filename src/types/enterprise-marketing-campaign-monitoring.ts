/**
 * CO-MARKETING-REDESIGN-015 — Campaign monitoring workspace contracts.
 * Durable operational records only. Never invent provider metrics.
 */

import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type { MarketingDurableLedgerStatus } from "@/types/enterprise-marketing-durability";
import type { MarketingProviderFailureCategory } from "@/types/enterprise-marketing-provider-contracts";

export const MARKETING_CAMPAIGN_MONITORING_METRIC_KEYS = [
  "frozenAudience",
  "queued",
  "attempted",
  "providerAccepted",
  "delivered",
  "deferred",
  "failed",
  "softBounced",
  "hardBounced",
  "opened",
  "clicked",
  "replied",
  "unsubscribed",
  "suppressed",
  "qualified",
] as const;

export type MarketingCampaignMonitoringMetricKey =
  (typeof MARKETING_CAMPAIGN_MONITORING_METRIC_KEYS)[number];

export type MarketingBounceCategory = "soft" | "hard";

export type MarketingMonitoringNextAction =
  | "retry"
  | "suppress"
  | "view_suppression"
  | "open_qualification"
  | "none";

export type MarketingMonitoringRetryBlockReason =
  | "delivered"
  | "hard_bounce"
  | "unsubscribed"
  | "complaint"
  | "permanently_suppressed"
  | "terminal_status"
  | "max_attempts"
  | "not_retryable_status"
  | null;

export type MarketingCampaignMonitoringCapabilities = {
  retry: boolean;
  suppress: boolean;
  viewSuppression: boolean;
  openQualification: boolean;
};

export type MarketingCampaignMonitoringSummary = {
  sprint: "CO-MARKETING-REDESIGN-015";
  generatedAt: string;
  organizationId: string;
  campaignId: string | null;
  durableAvailable: boolean;
  providerConnected: boolean;
  notice: string;
  metrics: Record<MarketingCampaignMonitoringMetricKey, MarketingMetricValue>;
  capabilities: MarketingCampaignMonitoringCapabilities;
};

export type MarketingCampaignRecipientExplorerFilters = {
  deliveryState?: MarketingDurableLedgerStatus | "snapshotted" | "all" | null;
  batch?: number | "all" | null;
  attempt?: "all" | "zero" | "one_or_more" | "maxed" | null;
  bounceCategory?: MarketingBounceCategory | "none" | "all" | null;
  engagement?: "all" | "opened" | "clicked" | "replied" | "none" | null;
  suppression?: "all" | "yes" | "no" | null;
  qualification?: "all" | "qualified" | "not_qualified" | null;
  from?: string | null;
  to?: string | null;
};

export type MarketingCampaignRecipientExplorerRow = {
  id: string;
  organizationId: string;
  campaignId: string;
  snapshotId: string;
  ledgerId: string | null;
  identityPreview: string;
  fingerprintPreview: string;
  sourceKey: string;
  batchNumber: number | null;
  status: MarketingDurableLedgerStatus | "snapshotted";
  latestEvent: string | null;
  latestEventAt: string | null;
  attemptCount: number;
  failureCategory: MarketingProviderFailureCategory;
  bounceCategory: MarketingBounceCategory | null;
  nextPermittedAction: MarketingMonitoringNextAction;
  retryBlockedReason: MarketingMonitoringRetryBlockReason;
  allowedActions: MarketingMonitoringNextAction[];
  qualificationId: string | null;
  suppressed: boolean;
};

export type MarketingCampaignRecipientExplorerPage = {
  rows: MarketingCampaignRecipientExplorerRow[];
  total: number;
  page: number;
  pageSize: number;
  durableAvailable: boolean;
  notice: string;
  filters: MarketingCampaignRecipientExplorerFilters;
};

export type MarketingRecipientTimelineEvent = {
  id: string;
  occurredAt: string;
  type: string;
  summary: string;
  source: "snapshot" | "ledger" | "engagement" | "suppression" | "qualification";
};

export type MarketingRecipientTimeline = {
  recipientId: string;
  organizationId: string;
  campaignId: string;
  identityPreview: string;
  sourceKey: string;
  events: MarketingRecipientTimelineEvent[];
  durableAvailable: boolean;
  notice: string;
};

export type MarketingMonitoringRetryDecision = {
  allowed: boolean;
  reason: MarketingMonitoringRetryBlockReason;
};
