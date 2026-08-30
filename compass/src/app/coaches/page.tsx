import type { Metadata } from "next";
import { CoachesHubContent } from "@/components/pages/coaches-hub-content";

export const metadata: Metadata = {
  title: "Coaches",
  description:
    "Product-specific COMPASS coaches for Home Loan, Unsecured Business Loan, LAP, Personal Loan, Construction Funding, and Working Capital.",
};

export default function CoachesPage() {
  return <CoachesHubContent />;
}
