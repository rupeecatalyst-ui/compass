import { PageHeader } from "@/components/design-system/page-header";
import { ElwLenderRegistry } from "@/components/catalyst-one/enterprise-lender-workspace";

/**
 * Enterprise Lender Directory — Enterprise Table Standard.
 * Dense spreadsheet listing; rich layouts only inside the lender workspace.
 */
export default function LendersPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Lenders"
        description="Compare lender programs side-by-side — ROI, Lender Score, Contact Score, funding, tenure, fee, and TAT."
      />
      <ElwLenderRegistry />
    </div>
  );
}
