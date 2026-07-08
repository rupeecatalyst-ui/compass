import type { Metadata } from "next";
import { AboutPageContent } from "@/components/pages/about-page-content";

export const metadata: Metadata = {
  title: "About",
  description: "Learn why COMPASS exists — intelligent borrowing guidance powered by Rupee Catalyst.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
