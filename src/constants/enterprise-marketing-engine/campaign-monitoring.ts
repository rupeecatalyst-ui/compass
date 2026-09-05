/**
 * CO-MARKETING-REDESIGN-015 — Campaign monitoring labels. Display only — no formulas.
 */

import type {
  MarketingCampaignMonitoringMetricKey,
  MarketingMonitoringNextAction,
} from "@/types/enterprise-marketing-campaign-monitoring";

export const MARKETING_CAMPAIGN_MONITORING_LABELS: Record<
  MarketingCampaignMonitoringMetricKey,
  string
> = {
  frozenAudience: "Frozen audience",
  queued: "Queued",
  attempted: "Attempted",
  providerAccepted: "Provider accepted",
  delivered: "Delivered",
  deferred: "Deferred",
  failed: "Failed",
  softBounced: "Soft bounced",
  hardBounced: "Hard bounced",
  opened: "Opened",
  clicked: "Clicked",
  replied: "Replied",
  unsubscribed: "Unsubscribed",
  suppressed: "Suppressed",
  qualified: "Qualified",
};

export const MARKETING_CAMPAIGN_MONITORING_NOTICE =
  "Campaign monitoring uses durable operational records only. Provider metrics show Unavailable when the provider is not connected. Opens and clicks never qualify a recipient." as const;

export const MARKETING_MONITORING_NEXT_ACTION_LABELS: Record<MarketingMonitoringNextAction, string> = {
  retry: "Retry eligible failure",
  suppress: "Suppress recipient",
  view_suppression: "View suppression history",
  open_qualification: "Open qualification record",
  none: "None",
};

export const MARKETING_CAMPAIGN_RECIPIENT_PAGE_SIZE = 50 as const;

export const MARKETING_MONITORING_RETRY_FORBIDDEN_NOTICE =
  "Retry is not permitted for delivered recipients, hard bounces, unsubscribed recipients, complaints, or permanently suppressed identities." as const;
