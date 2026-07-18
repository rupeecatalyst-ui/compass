import { PageHeader } from "@/components/design-system/page-header";
import { ElwLenderRegistry } from "@/components/catalyst-one/enterprise-lender-workspace";

/**
 * CO-SPRINT-093 — Enterprise Lender Directory.
 * Product-navigated program grid for operational comparison.
 */
export default function LendersPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Lenders"
        description="Enterprise lender program directory — compare ROI, Lender Score, and Contact Score by product."
      />
      <ElwLenderRegistry />
    </div>
  );
}
