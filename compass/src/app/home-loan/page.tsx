import type { Metadata } from "next";
import { HomeLoanPageContent } from "@/components/pages/home-loan-page-content";

const description =
  "Find your best way home. COMPASS guides you through every step — with calm clarity, not pressure.";

export const metadata: Metadata = {
  title: "Home Loan | Find Your Best Way Home",
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
