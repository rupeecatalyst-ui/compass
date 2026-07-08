"use client";

import { HeroSection } from "@/components/homepage/hero-section";
import { ThoughtStreamSection } from "@/components/homepage/thought-stream-section";
import { WhyCompassSection } from "@/components/homepage/why-compass-section";
import { FinancialToolsSection } from "@/components/homepage/financial-tools-section";
import { SarathiSection } from "@/components/homepage/sarathi-section";
import { FinalCtaSection } from "@/components/homepage/final-cta-section";

export function HomePageContent() {
  return (
    <>
      <HeroSection />
      <ThoughtStreamSection />
      <WhyCompassSection />
      <FinancialToolsSection />
      <SarathiSection />
      <FinalCtaSection />
    </>
  );
}
