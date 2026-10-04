/**
 * CO-MARKETING-REDESIGN-010 — Monitoring labels. Display only — no formulas.
 */

import type { MarketingMonitoringMetricKey } from "@/types/enterprise-marketing-monitoring";

export const MARKETING_MONITORING_LABELS: Record<MarketingMonitoringMetricKey, string> = {
  sourceRows: "Source rows",
  eligible: "Eligible",
  snapshotted: "Snapshotted",
  queued: "Queued",
  attempted: "Attempted",
  simulatedSent: "Simulated / sent",
  delivered: "Delivered",
  deferred: "Deferred",
  bounced: "Bounced",
  failed: "Failed",
  opened: "Opened",
  clicked: "Clicked",
  replied: "Replied",
  unsubscribed: "Unsubscribed",
  suppressed: "Suppressed",
  qualified: "Qualified",
  contactCreated: "Contact created",
  contactReused: "Contact reused",
  opportunityCreated: "Opportunity created",
  attributedPipeline: "Attributed pipeline",
  attributedRevenue: "Attributed revenue",
};

export const MARKETING_MONITORING_NOTICE =
  "Metrics come from durable campaign records only. Provider events show Unavailable or Not connected until a provider is connected. Opens and clicks never create Contact or Opportunity.";

export const MARKETING_RECIPIENT_EXPLORER_PAGE_SIZE = 50 as const;
