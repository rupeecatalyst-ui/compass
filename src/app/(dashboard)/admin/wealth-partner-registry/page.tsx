import { Suspense } from "react";
import { PageHeader } from "@/components/design-system/page-header";
import { WealthPartnerRegistryView } from "@/components/catalyst-one/wealth-partner-registry";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-WP-001 — Admin entry → same registry desk. */
export default function AdminWealthPartnerRegistryPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="contacts"
          statusLabel="Opening Wealth Partner Registry…"
          density="panel"
        />
      }
    >
      <div className="space-y-3">
        <PageHeader
          title="Wealth Partner Registry"
          description="Administration master for Enterprise Wealth Partners (CO-WP-001)."
        />
        <WealthPartnerRegistryView />
      </div>
    </Suspense>
  );
}
