import type { Metadata } from "next";
import { HomeLoanPageContent } from "@/components/pages/home-loan-page-content";

export const metadata: Metadata = {
  title: "Home Loan Coach",
  description:
    "COMPASS guides you through home loan decisions with calm clarity — so you borrow with confidence, not pressure.",
};

export default function HomeLoanPage() {
  return <HomeLoanPageContent />;
}
