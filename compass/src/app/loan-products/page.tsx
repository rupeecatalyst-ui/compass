import type { Metadata } from "next";
import { LoanProductsPageContent } from "@/components/pages/loan-products-page-content";

export const metadata: Metadata = {
  title: "Loan Products",
  description: "Explore home loans, business loans, LAP, working capital, construction finance, and personal loans with COMPASS.",
};

export default function LoanProductsPage() {
  return <LoanProductsPageContent />;
}
