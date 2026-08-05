import { Suspense } from "react";
import { EnterpriseLenderDirectoryWorkspace } from "@/components/catalyst-one/enterprise-lender-directory";
import { EnterpriseRegistryWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-registry-workspace-shell";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { ENTERPRISE_LENDER_DIRECTORY_TITLE } from "@/constants/enterprise-lender-directory";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/**
 * CO-ARCH-ELD-001 — Enterprise Lender Directory.
 * Route remains `/lenders` (backward compatible). Landing is registry table — not analytics.
 * Analytics live inside the lender slide-over workspace after selection.
 */
export default function LendersPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="lenders"
          statusLabel="Opening Enterprise Lender Directory…"
          density="panel"
        />
      }
    >
      <EnterpriseRegistryWorkspaceShell
        title={ENTERPRISE_LENDER_DIRECTORY_TITLE}
        breadcrumbs={buildSimpleWorkspaceBreadcrumbs(ENTERPRISE_LENDER_DIRECTORY_TITLE)}
        layoutMode="document"
        data-surface="enterprise-lender-directory"
        data-sprint="CO-ARCH-ELD-001"
      >
        <EnterpriseLenderDirectoryWorkspace />
      </EnterpriseRegistryWorkspaceShell>
    </Suspense>
  );
}
