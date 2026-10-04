import { Suspense } from "react";
import { MarketingCampaignRegistryPanel } from "@/components/catalyst-one/admin/marketing/marketing-campaign-registry-panel";

export default function AdminMarketingRegistryPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading Campaign Registry…</p>}>
      <MarketingCampaignRegistryPanel />
    </Suspense>
  );
}
