import type { Metadata } from "next";
import { WorkingCapitalPageContent } from "@/components/pages/working-capital-page-content";

const description =
  "Working capital guidance for business continuity — liquidity strategy, funding structure, and cash flow optimisation.";

export const metadata: Metadata = {
  title: "Working Capital Coach",
  description,
  alternates: { canonical: "/working-capital" },
  openGraph: {
    title: "Working Capital Coach | COMPASS",
    description,
    url: "/working-capital",
  },
};

export default function WorkingCapitalPage() {
  return <WorkingCapitalPageContent />;
}
