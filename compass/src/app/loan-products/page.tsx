import type { Metadata } from "next";
import { LoanProductsPageContent } from "@/components/pages/loan-products-page-content";

export const metadata: Metadata = {
  title: "Loan Products",
  description:
    "Explore borrowing solutions designed around your goals, profile and repayment capacity—not a generic product catalogue.",
};

export default function LoanProductsPage() {
  return <LoanProductsPageContent />;
}
