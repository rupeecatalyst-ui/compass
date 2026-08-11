import { ProductLenderPriorityWorkspace } from "@/components/catalyst-one/admin/product-lender-priority-workspace";

/** CO-PERSONAL-LOAN-PRIORITY-001 — Personal Loan lender priority desk (opens on PL tab). */
export default function AdminPersonalLoanLenderPriorityPage() {
  return <ProductLenderPriorityWorkspace initialTab="PERSONAL_LOAN" />;
}
