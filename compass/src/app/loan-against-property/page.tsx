import type { Metadata } from "next";
import { LapPageContent } from "@/components/pages/lap-page-content";

const description =
  "Unlock property value with clarity — equity analysis, responsible borrowing guidance, and premium lender matching.";

export const metadata: Metadata = {
  title: "Loan Against Property Coach",
  description,
  alternates: { canonical: "/loan-against-property" },
  openGraph: {
    title: "Loan Against Property Coach | COMPASS",
    description,
    url: "/loan-against-property",
  },
};

export default function LoanAgainstPropertyPage() {
  return <LapPageContent />;
}
