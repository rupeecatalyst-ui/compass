import type { Metadata } from "next";
import { InvestPageContent } from "@/components/pages/invest-page-content";

export const metadata: Metadata = {
  title: "Invest",
  description:
    "Choose your investment goal. COMPASS shapes strategy before recommending products.",
};

export default function InvestPage() {
  return <InvestPageContent />;
}
