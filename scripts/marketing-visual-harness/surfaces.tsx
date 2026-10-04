"use client";

/**
 * Non-deployable visual harness surfaces.
 * Each surface mounts the same production component used under /admin/marketing.
 */

import { MarketingCommandCenter } from "@/components/catalyst-one/admin/marketing/marketing-command-center";
import { MarketingCampaignRegistryPanel } from "@/components/catalyst-one/admin/marketing/marketing-campaign-registry-panel";
import { MarketingCampaignBuilderPage } from "@/components/catalyst-one/admin/marketing/marketing-campaign-builder-page";
import { MarketingCampaignMonitoringWorkspace } from "@/components/catalyst-one/admin/marketing/marketing-campaign-monitoring-workspace";
import { MarketingConsentPanel } from "@/components/catalyst-one/admin/marketing/marketing-consent-panel";
import { MarketingResponsesPanel } from "@/components/catalyst-one/admin/marketing/marketing-responses-panel";
import { MarketingAttributionPanel } from "@/components/catalyst-one/admin/marketing/marketing-attribution-panel";
import { MarketingAssetsPanel } from "@/components/catalyst-one/admin/marketing/marketing-assets-panel";
import { MarketingDeliverabilityPanel } from "@/components/catalyst-one/admin/marketing/marketing-deliverability-panel";

const CAMPAIGN_ID = "mkt-camp-visual-fixture";

export const VISUAL_SURFACES = {
  home: () => <MarketingCommandCenter />,
  registry: () => <MarketingCampaignRegistryPanel />,
  basics: () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={1} />,
  "audience-source": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={2} />,
  "column-mapping": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={2} />,
  "eligibility-preview": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={2} />,
  "template-gallery": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={3} />,
  "visual-editor": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={3} />,
  personalisation: () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={4} />,
  "desktop-preview": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={4} />,
  "mobile-preview": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={4} />,
  "schedule-delivery": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={5} />,
  "review-approval": () => <MarketingCampaignBuilderPage campaignId={CAMPAIGN_ID} initialStep={6} />,
  monitoring: () => <MarketingCampaignMonitoringWorkspace />,
  "recipient-timeline": () => <MarketingCampaignMonitoringWorkspace />,
  consent: () => <MarketingConsentPanel />,
  qualification: () => <MarketingResponsesPanel />,
  analytics: () => <MarketingAttributionPanel />,
  assets: () => <MarketingAssetsPanel />,
  deliverability: () => <MarketingDeliverabilityPanel />,
};

export function MarketingVisualHarnessApp({ surface }: { surface: keyof typeof VISUAL_SURFACES }) {
  const Render = VISUAL_SURFACES[surface] ?? VISUAL_SURFACES.home;
  return (
    <div data-visual-harness="marketing-local" data-surface={surface}>
      <p className="sr-only">Local Marketing visual harness · fixture · no production data · send disabled</p>
      <Render />
    </div>
  );
}
