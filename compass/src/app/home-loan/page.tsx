import type { Metadata } from "next";
import { HomeLoanPageContent } from "@/components/pages/home-loan-page-content";

const description =
  "COMPASS guides you through home loan decisions with calm clarity — so you borrow with confidence, not pressure.";

export const metadata: Metadata = {
  title: "Home Loan Coach",
  description,
  alternates: { canonical: "/home-loan" },
  openGraph: {
    title: "Home Loan Coach | COMPASS",
    description,
    url: "/home-loan",
  },
};

export default function HomeLoanPage() {
  return <HomeLoanPageContent />;
}
