import { Suspense } from "react";
import { PageHeader } from "@/components/design-system/page-header";
import { WealthPartnerRegistryView } from "@/components/catalyst-one/wealth-partner-registry";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-WP-001 — Enterprise Wealth Partner Registry (operational desk). */
export default function WealthPartnersPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="contacts"
          statusLabel="Opening Wealth Partners…"
          density="panel"
        />
      }
    >
      <div className="space-y-3">
        <WorkspaceExitNav
          breadcrumbs={buildSimpleWorkspaceBreadcrumbs("Wealth Partners")}
          className="-mx-4 sm:-mx-6"
        />
        <PageHeader
          title="Enterprise Wealth Partner Registry"
          description="Business relationships with Rupee Catalyst — built on Contact or Company identity. Not a profession master."
        />
        <WealthPartnerRegistryView />
      </div>
    </Suspense>
  );
}
