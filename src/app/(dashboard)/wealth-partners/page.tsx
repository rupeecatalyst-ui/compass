import { Suspense } from "react";
import { WealthPartnerRegistryView } from "@/components/catalyst-one/wealth-partner-registry";
import { EnterpriseRegistryWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-registry-workspace-shell";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-WP-001 — Enterprise Wealth Partner Registry (operational desk). CO-UX-016 shell. */
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
      <EnterpriseRegistryWorkspaceShell
        title="Wealth Partners"
        subtitle="Business relationships"
        breadcrumbs={buildSimpleWorkspaceBreadcrumbs("Wealth Partners")}
        data-surface="wealth-partner-registry"
        data-sprint="CO-UX-016"
      >
        <WealthPartnerRegistryView />
      </EnterpriseRegistryWorkspaceShell>
    </Suspense>
  );
}
