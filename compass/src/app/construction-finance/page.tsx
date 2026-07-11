import type { Metadata } from "next";
import { ConstructionFinancePageContent } from "@/components/pages/construction-finance-page-content";

const description =
  "Construction finance with discipline — stage-wise disbursement, project-aligned funding, and visionary planning.";

export const metadata: Metadata = {
  title: "Construction Finance Coach",
  description,
  alternates: { canonical: "/construction-finance" },
  openGraph: {
    title: "Construction Finance Coach | COMPASS",
    description,
    url: "/construction-finance",
  },
};

export default function ConstructionFinancePage() {
  return <ConstructionFinancePageContent />;
}
