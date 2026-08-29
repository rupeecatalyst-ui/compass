import type { Metadata } from "next";
import { LegalPageContent } from "@/components/pages/legal-page-content";
import { legalContent } from "@/config/legal";

export const metadata: Metadata = {
  title: legalContent.privacy.title,
  description:
    "How Rupee Catalyst COMPASS collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPageContent content={legalContent.privacy} />;
}
