import { PageHeader } from "@/components/design-system/page-header";
import { ElwLenderRegistry } from "@/components/catalyst-one/enterprise-lender-workspace";

/**
 * Lender Master — enterprise knowledge center (premium landing cards).
 * Open any lender for product-contextual workspace + relationship hierarchy.
 */
export default function LendersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lenders"
        description="Enterprise knowledge center for every lending partner — products, policy placeholders, and relationship hierarchy."
      />
      <ElwLenderRegistry />
    </div>
  );
}
