import type { Metadata } from "next";
import { HomePageContent } from "@/components/pages/home-page-content";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Borrow Better. Invest Smarter.",
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${siteConfig.name} — Borrow Better. Invest Smarter.`,
    description: siteConfig.description,
    url: "/",
  },
};

export default function HomePage() {
  return <HomePageContent />;
}
