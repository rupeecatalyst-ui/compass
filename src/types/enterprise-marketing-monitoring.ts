/**
 * CO-MARKETING-REDESIGN-010 — Durable-data-driven Marketing monitoring contracts.
 * Never invent provider metrics. No audience-row mirror. No Lead entity.
 */

import type { MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type { MarketingDurableLedgerStatus } from "@/types/enterprise-marketing-durability";

export const MARKETING_MONITORING_METRIC_KEYS = [
  "sourceRows",
  "eligible",
  "snapshotted",
  "queued",
  "attempted",
  "simulatedSent",
  "delivered",
  "deferred",
  "bounced",
  "failed",
  "opened",
  "clicked",
  "replied",
  "unsubscribed",
  "suppressed",
  "qualified",
  "contactCreated",
  "contactReused",
  "opportunityCreated",
  "attributedPipeline",
  "attributedRevenue",
] as const;

export type MarketingMonitoringMetricKey = (typeof MARKETING_MONITORING_METRIC_KEYS)[number];

export type MarketingMonitoringDashboard = {
  sprint: "CO-MARKETING-REDESIGN-010";
  generatedAt: string;
  organizationId: string;
  durableAvailable: boolean;
  providerConnected: boolean;
  notice: string;
  metrics: Record<MarketingMonitoringMetricKey, MarketingMetricValue>;
};

export type MarketingRecipientExplorerRow = {
  id: string;
  organizationId: string;
  campaignId: string;
  snapshotId: string;
  ledgerId: string | null;
  status: MarketingDurableLedgerStatus | "snapshotted";
  fingerprintPreview: string;
  emailPreview: string;
  batchNumber: number | null;
  sourceRowNumber: number | null;
  linkedContact: boolean;
  linkedOpportunity: boolean;
};

export type MarketingRecipientExplorerPage = {
  rows: MarketingRecipientExplorerRow[];
  total: number;
  page: number;
  pageSize: number;
  durableAvailable: boolean;
  notice: string;
};
