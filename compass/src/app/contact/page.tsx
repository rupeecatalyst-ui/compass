import type { Metadata } from "next";
import { ContactPageContent } from "@/components/pages/contact-page-content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the COMPASS team about your borrowing needs.",
};

export default function ContactPage() {
  return <ContactPageContent />;
}
