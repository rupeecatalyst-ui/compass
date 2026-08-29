import type { Metadata } from "next";
import { LegalPageContent } from "@/components/pages/legal-page-content";
import { legalContent } from "@/config/legal";

export const metadata: Metadata = {
  title: legalContent.terms.title,
  description: "Terms and conditions for using the Rupee Catalyst COMPASS platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalPageContent content={legalContent.terms} />;
}
