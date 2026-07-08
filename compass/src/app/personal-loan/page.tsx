import type { Metadata } from "next";
import { PersonalLoanPageContent } from "@/components/pages/personal-loan-page-content";

const description =
  "A fast, calm personal loan journey — smart lender selection, clean clarity, and a Rupee Catalyst Advantage designed for stress-free decisions.";

export const metadata: Metadata = {
  title: "Personal Loan Coach",
  description,
  alternates: { canonical: "/personal-loan" },
  openGraph: {
    title: "Personal Loan Coach | COMPASS",
    description,
    url: "/personal-loan",
  },
};

export default function PersonalLoanPage() {
  return <PersonalLoanPageContent />;
}

