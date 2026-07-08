import type { Metadata } from "next";
import { PlaceholderPageContent } from "@/components/pages/placeholder-page-content";

export const metadata: Metadata = {
  title: "Resources",
  description: "Borrowing guides, articles, and the Knowledge Centre — coming soon on COMPASS.",
};

export default function ResourcesPage() {
  return <PlaceholderPageContent page="resources" />;
}
