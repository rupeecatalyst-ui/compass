import type { Metadata } from "next";
import { BusinessLoanPageContent } from "@/components/pages/business-loan-page-content";

const description =
  "A strategic business loan experience — growth planning, cash flow insights, and executive-grade lender matching.";

export const metadata: Metadata = {
  title: "Business Loan Coach",
  description,
  alternates: { canonical: "/business-loan" },
  openGraph: {
    title: "Business Loan Coach | COMPASS",
    description,
    url: "/business-loan",
  },
};

export default function BusinessLoanPage() {
  return <BusinessLoanPageContent />;
}
