import type { Metadata } from "next";
import { ContactPageContent } from "@/components/pages/contact-page-content";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Call, WhatsApp or email ${siteConfig.company} — ${siteConfig.officeAddress}.`,
};

export default function ContactPage() {
  return <ContactPageContent />;
}
