import { Suspense } from "react";
import { WealthPartnerRegistryView } from "@/components/catalyst-one/wealth-partner-registry";
import { EnterpriseRegistryWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-registry-workspace-shell";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/** CO-WP-001 — Admin entry → same registry desk. CO-UX-016. */
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
      <EnterpriseRegistryWorkspaceShell
        title="Wealth Partners"
        subtitle="Administration master"
        data-surface="wealth-partner-registry-admin"
        data-sprint="CO-UX-016"
      >
        <WealthPartnerRegistryView />
      </EnterpriseRegistryWorkspaceShell>
    </Suspense>
  );
}
