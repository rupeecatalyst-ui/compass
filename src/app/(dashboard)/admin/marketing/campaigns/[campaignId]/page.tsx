import { MarketingCampaignBuilderPage } from "@/components/catalyst-one/admin/marketing/marketing-campaign-builder-page";

export default async function AdminMarketingCampaignBuilderWorkspacePage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <MarketingCampaignBuilderPage campaignId={campaignId} />;
}
