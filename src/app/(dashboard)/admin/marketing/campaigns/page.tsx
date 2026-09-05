import { Suspense } from "react";
import { MarketingCampaignsPanel } from "@/components/catalyst-one/admin/marketing/marketing-campaigns-panel";

export default function AdminMarketingCampaignsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading Campaign Builder…</p>}>
      <MarketingCampaignsPanel />
    </Suspense>
  );
}
