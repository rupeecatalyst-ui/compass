/**
 * CO-MARKETING-REDESIGN-005 — Campaign Registry filters and lifecycle actions.
 */

import type { MarketingCampaign } from "@/types/enterprise-marketing-campaign";
import type { MarketingCampaignAction, MarketingCampaignStatus, MarketingChannel } from "@/constants/enterprise-marketing-engine";
import { MARKETING_PERMISSIONS } from "@/constants/enterprise-marketing-engine/permissions";
import { hasMarketingPermission, type MarketingPermissionActor } from "@/lib/enterprise-marketing-engine/permissions";
import type { MarketingAudienceDefinition } from "@/types/enterprise-marketing-audience";
import type {
  MarketingCampaignAnalyticsRow,
  MarketingMetricValue,
} from "@/types/enterprise-marketing-analytics";
import { unavailableMarketingMetric } from "@/lib/enterprise-marketing-engine/home-overview";
import type { MarketingRegistryDatePreset } from "@/constants/enterprise-marketing-engine/home-registry";

export type MarketingRegistryFilters = {
  search: string;
  channel: MarketingChannel | "all";
  status: MarketingCampaignStatus | "all";
  ownerUserId: string | "all";
  datePreset: MarketingRegistryDatePreset;
};

export type MarketingRegistryAction = {
  id: string;
  label: string;
  lifecycleAction?: MarketingCampaignAction;
  kind: "lifecycle" | "navigate" | "forbidden";
  reason?: string;
};

export type MarketingRegistryRow = {
  campaign: MarketingCampaign;
  audienceName: string | null;
  audienceCount: MarketingMetricValue;
  approvalStatus: string;
  scheduleLabel: string;
  batchProgress: MarketingMetricValue;
  delivered: MarketingMetricValue;
  failed: MarketingMetricValue;
  opened: MarketingMetricValue;
  clicked: MarketingMetricValue;
  replied: MarketingMetricValue;
  qualifiedResponses: MarketingMetricValue;
  actions: MarketingRegistryAction[];
};

export function defaultMarketingRegistryFilters(): MarketingRegistryFilters {
  return {
    search: "",
    channel: "all",
    status: "all",
    ownerUserId: "all",
    datePreset: "all",
  };
}

export function filterMarketingRegistryCampaigns(
  campaigns: MarketingCampaign[],
  filters: MarketingRegistryFilters,
  nowMs = Date.now(),
): MarketingCampaign[] {
  const q = filters.search.trim().toLowerCase();
  const windowMs =
    filters.datePreset === "7d"
      ? 7 * 24 * 60 * 60 * 1000
      : filters.datePreset === "30d"
        ? 30 * 24 * 60 * 60 * 1000
        : filters.datePreset === "90d"
          ? 90 * 24 * 60 * 60 * 1000
          : null;
  return campaigns.filter((campaign) => {
    if (q) {
      const hay = `${campaign.name} ${campaign.channel} ${campaign.status}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.channel !== "all" && campaign.channel !== filters.channel) return false;
    if (filters.status !== "all" && campaign.status !== filters.status) return false;
    if (filters.ownerUserId !== "all") {
      const owner = campaign.governance?.createdByUserId ?? "";
      if (owner !== filters.ownerUserId) return false;
    }
    if (windowMs) {
      const stamp = Date.parse(campaign.updatedAt || campaign.createdAt);
      if (!Number.isFinite(stamp) || nowMs - stamp > windowMs) return false;
    }
    return true;
  });
}

export function marketingRegistryActionsForCampaign(input: {
  status: MarketingCampaignStatus;
  actor: MarketingPermissionActor;
  executionEnabled: boolean;
}): MarketingRegistryAction[] {
  const actions: MarketingRegistryAction[] = [
    { id: "open_builder", label: "Open in builder", kind: "navigate" },
  ];
  const { status, actor, executionEnabled } = input;

  const sendForbidden: MarketingRegistryAction = {
    id: "send",
    label: "Send",
    kind: "forbidden",
    reason:
      status === "DRAFT" || status === "PREVIEW" || status === "READY_FOR_REVIEW"
        ? "Send is not available from an unapproved draft"
        : "Live send is disabled in TEST MODE",
  };

  if (!executionEnabled || status === "DRAFT" || status === "PREVIEW" || status === "READY_FOR_REVIEW") {
    actions.push(sendForbidden);
  }

  if (status === "RUNNING") {
    actions.push({ id: "pause", label: "Pause", lifecycleAction: "PAUSE", kind: "lifecycle" });
    actions.push({ id: "stop", label: "Stop", lifecycleAction: "STOP", kind: "lifecycle" });
  }
  if (status === "PAUSED") {
    actions.push({ id: "resume", label: "Resume", lifecycleAction: "RESUME", kind: "lifecycle" });
    actions.push({ id: "stop", label: "Stop", lifecycleAction: "STOP", kind: "lifecycle" });
  }
  if (status === "READY_FOR_REVIEW" && hasMarketingPermission(actor, MARKETING_PERMISSIONS.CAMPAIGN_APPROVE)) {
    actions.push({ id: "approve", label: "Approve", lifecycleAction: "APPROVE", kind: "lifecycle" });
  }
  return actions;
}

export function approvalStatusLabel(status: MarketingCampaignStatus): string {
  if (status === "DRAFT" || status === "PREVIEW") return "Not submitted";
  if (status === "READY_FOR_REVIEW") return "Awaiting approval";
  if (status === "APPROVED" || status === "SCHEDULED" || status === "RUNNING" || status === "PAUSED" || status === "COMPLETED") {
    return "Approved";
  }
  if (status === "CANCELLED" || status === "STOPPED" || status === "FAILED") return status;
  return status;
}

export function scheduleLabel(campaign: MarketingCampaign): string {
  const start = campaign.schedulePlaceholder?.startAt ?? campaign.batchPolicy?.startAt ?? null;
  if (!start) return "Not scheduled";
  return start;
}

export function buildMarketingRegistryRows(input: {
  campaigns: MarketingCampaign[];
  audiences: MarketingAudienceDefinition[];
  analyticsRows?: MarketingCampaignAnalyticsRow[] | null;
  actor: MarketingPermissionActor;
  executionEnabled: boolean;
}): MarketingRegistryRow[] {
  const audienceById = new Map(input.audiences.map((row) => [row.id, row]));
  const analyticsById = new Map((input.analyticsRows ?? []).map((row) => [row.campaignId, row]));
  return input.campaigns.map((campaign) => {
    const audience = campaign.audienceId ? audienceById.get(campaign.audienceId) : undefined;
    const analytics = analyticsById.get(campaign.id);
    return {
      campaign,
      audienceName: audience?.name ?? null,
      audienceCount: analytics?.audienceEstimate != null
        ? { availability: "available", value: analytics.audienceEstimate, reason: null }
        : unavailableMarketingMetric("Unavailable"),
      approvalStatus: approvalStatusLabel(campaign.status),
      scheduleLabel: scheduleLabel(campaign),
      batchProgress:
        analytics?.progressPercent != null
          ? { availability: "available", value: analytics.progressPercent, reason: null }
          : unavailableMarketingMetric("Unavailable"),
      delivered: analytics?.delivered ?? unavailableMarketingMetric("Unavailable"),
      failed: analytics?.failed ?? unavailableMarketingMetric("Unavailable"),
      opened: analytics?.opened ?? unavailableMarketingMetric("Unavailable"),
      clicked: analytics?.clicked ?? unavailableMarketingMetric("Unavailable"),
      replied: analytics?.replied ?? unavailableMarketingMetric("Unavailable"),
      qualifiedResponses: analytics?.qualified ?? unavailableMarketingMetric("Unavailable"),
      actions: marketingRegistryActionsForCampaign({
        status: campaign.status,
        actor: input.actor,
        executionEnabled: input.executionEnabled,
      }),
    };
  });
}
