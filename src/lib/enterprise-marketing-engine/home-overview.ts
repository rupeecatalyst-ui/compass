/**
 * CO-MARKETING-REDESIGN-005 — Honest Marketing Home overview (no fabricated zeroes).
 */

import type { MarketingCampaign } from "@/types/enterprise-marketing-campaign";
import type { MarketingAnalyticsDashboard, MarketingMetricValue } from "@/types/enterprise-marketing-analytics";
import type { MarketingQualificationRecord } from "@/types/enterprise-marketing-qualification";
import {
  MARKETING_ATTENTION_STATUSES,
  MARKETING_HOME_LIFECYCLE_CARDS,
  MARKETING_TEST_MODE_BANNER,
  type MarketingHomeLifecycleCardId,
} from "@/constants/enterprise-marketing-engine/home-registry";

export function unavailableMarketingMetric(
  reason: "Unavailable" | "Not connected",
): MarketingMetricValue {
  return { availability: "unavailable", value: null, reason };
}

export function availableMarketingMetric(value: number): MarketingMetricValue {
  return { availability: "available", value, reason: null };
}

export function formatMarketingMetricValue(metric: MarketingMetricValue): string {
  if (metric.availability !== "available" || metric.value == null) {
    return metric.reason ?? "Unavailable";
  }
  return String(metric.value);
}

export type MarketingHomeLifecycleCard = {
  id: MarketingHomeLifecycleCardId;
  label: string;
  metric: MarketingMetricValue;
};

export type MarketingHomeOverview = {
  testMode: boolean;
  testModeBanner: string;
  lifecycleCards: MarketingHomeLifecycleCard[];
  qualifiedResponses: MarketingMetricValue;
  opportunitiesCreated: MarketingMetricValue;
  attributedPipeline: MarketingMetricValue;
  requiringAttention: MarketingCampaign[];
  recentActivity: Array<{
    campaignId: string;
    campaignName: string;
    action: string;
    from: string;
    to: string;
    at: string;
  }>;
  deliveryHealth: {
    sent: MarketingMetricValue;
    failed: MarketingMetricValue;
    delivered: MarketingMetricValue;
  };
  googleStatus: "Not connected" | "Fixture" | "Connected";
  providerStatus: "Not connected" | "Connected";
};

function countStatuses(
  campaigns: MarketingCampaign[],
  statuses: readonly string[],
): number {
  return campaigns.filter((row) => statuses.includes(row.status)).length;
}

export function composeMarketingHomeOverview(input: {
  campaigns: MarketingCampaign[];
  qualifications?: MarketingQualificationRecord[] | null;
  analytics?: MarketingAnalyticsDashboard | null;
  safety: {
    executionEnabled: boolean;
    providerConnectEnabled: boolean;
    sheetsMode: "off" | "fixture" | "live" | string;
    handoffEnabled?: boolean;
  };
}): MarketingHomeOverview {
  const campaigns = input.campaigns;
  const lifecycleCards: MarketingHomeLifecycleCard[] = MARKETING_HOME_LIFECYCLE_CARDS.map((card) => ({
    id: card.id,
    label: card.label,
    metric: availableMarketingMetric(countStatuses(campaigns, card.statuses)),
  }));

  const analyticsCc = input.analytics?.commandCenter;
  let qualifiedResponses = unavailableMarketingMetric("Unavailable");
  if (analyticsCc?.qualifiedResponses) {
    qualifiedResponses = analyticsCc.qualifiedResponses;
  } else if (input.qualifications) {
    qualifiedResponses = availableMarketingMetric(
      input.qualifications.filter(
        (row) => row.businessState === "QUALIFIED" || row.businessState === "HANDED_OFF",
      ).length,
    );
  }

  let opportunitiesCreated = unavailableMarketingMetric("Not connected");
  if (analyticsCc?.handoffOpportunities) {
    opportunitiesCreated = analyticsCc.handoffOpportunities;
  } else if (input.safety.handoffEnabled && input.qualifications) {
    opportunitiesCreated = availableMarketingMetric(
      input.qualifications.filter((row) => row.opportunityCreated === true || Boolean(row.opportunityId))
        .length,
    );
  } else if (input.safety.handoffEnabled === false) {
    opportunitiesCreated = unavailableMarketingMetric("Not connected");
  }

  const attributedPipeline = unavailableMarketingMetric("Not connected");

  const history = campaigns
    .flatMap((campaign) =>
      (campaign.stateHistory ?? []).map((event) => ({
        campaignId: campaign.id,
        campaignName: campaign.name,
        action: event.action,
        from: event.from,
        to: event.to,
        at: event.at,
      })),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const sheets = input.safety.sheetsMode;
  const googleStatus =
    sheets === "live" ? "Connected" : sheets === "fixture" ? "Fixture" : "Not connected";

  return {
    testMode: input.safety.executionEnabled !== true,
    testModeBanner: MARKETING_TEST_MODE_BANNER,
    lifecycleCards,
    qualifiedResponses,
    opportunitiesCreated,
    attributedPipeline,
    requiringAttention: campaigns.filter((row) =>
      (MARKETING_ATTENTION_STATUSES as readonly string[]).includes(row.status),
    ),
    recentActivity: history,
    deliveryHealth: {
      sent: analyticsCc?.sent ?? unavailableMarketingMetric("Unavailable"),
      failed: analyticsCc?.failed ?? unavailableMarketingMetric("Unavailable"),
      delivered: analyticsCc?.delivered ?? unavailableMarketingMetric("Unavailable"),
    },
    googleStatus,
    providerStatus: input.safety.providerConnectEnabled ? "Connected" : "Not connected",
  };
}
