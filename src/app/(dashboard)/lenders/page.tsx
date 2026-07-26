import { Suspense } from "react";
import { PageHeader } from "@/components/design-system/page-header";
import { ElwLenderRegistry } from "@/components/catalyst-one/enterprise-lender-workspace";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";

/**
 * Enterprise Lender Directory — Enterprise Table Standard.
 * Dense spreadsheet listing; rich layouts only inside the lender workspace.
 */
export default function LendersPage() {
  return (
    <Suspense
      fallback={
        <ChanakyaLoadingExperience
          module="lenders"
          statusLabel="Opening Lenders…"
          density="panel"
        />
      }
    >
      <div className="space-y-3">
        <WorkspaceExitNav breadcrumbs={buildSimpleWorkspaceBreadcrumbs("Lenders")} className="-mx-4 sm:-mx-6" />
        <PageHeader
          title="Lenders"
          description="Compare lender programs side-by-side — ROI, Lender Score, Contact Score, funding, tenure, fee, and TAT."
        />
        <ElwLenderRegistry />
      </div>
    </Suspense>
  );
}
