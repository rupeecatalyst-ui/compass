import type { Metadata } from "next";
import { AboutPageContent } from "@/components/pages/about-page-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Rupee Catalyst — Financial Fitness Champion. Founded in 2017 and operated by Peakprofits Capital Services Private Limited.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
