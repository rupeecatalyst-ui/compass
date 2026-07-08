import type { Metadata } from "next";
import { CoachesHubContent } from "@/components/pages/coaches-hub-content";

export const metadata: Metadata = {
  title: "Coaches",
  description:
    "Product-specific COMPASS coaches for Home Loan, Business Loan, LAP, Personal Loan, Construction Finance, and Working Capital.",
};

export default function CoachesPage() {
  return <CoachesHubContent />;
}
