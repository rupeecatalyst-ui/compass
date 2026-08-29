import type { Metadata } from "next";
import { LegalPageContent } from "@/components/pages/legal-page-content";
import { legalContent } from "@/config/legal";

export const metadata: Metadata = {
  title: legalContent.disclaimer.title,
  description: "Important disclaimers for information on the Rupee Catalyst COMPASS platform.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return <LegalPageContent content={legalContent.disclaimer} />;
}
