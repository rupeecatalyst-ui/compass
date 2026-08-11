import { ProductLenderPriorityWorkspace } from "@/components/catalyst-one/admin/product-lender-priority-workspace";

/** CO-UBL-PRIORITY-001 — Unsecured Business Loan lender priority desk. */
export default function AdminUblLenderPriorityPage() {
  return <ProductLenderPriorityWorkspace initialTab="BUSINESS_LOAN_UNSECURED" />;
}
