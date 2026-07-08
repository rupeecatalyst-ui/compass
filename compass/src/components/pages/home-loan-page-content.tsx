"use client";

import { HeroSection } from "@/components/homepage/hero-section";
import { StrategyAssessmentSection } from "@/components/homepage/strategy-assessment-section";
import { ThoughtStreamSection } from "@/components/homepage/thought-stream-section";
import { WhyCompassSection } from "@/components/homepage/why-compass-section";
import { FinancialToolsSection } from "@/components/homepage/financial-tools-section";
import { SarathiSection } from "@/components/homepage/sarathi-section";
import { FinalCtaSection } from "@/components/homepage/final-cta-section";

export function HomeLoanPageContent() {
  return (
    <>
      <HeroSection />
      <StrategyAssessmentSection />
      <ThoughtStreamSection />
      <WhyCompassSection />
      <FinancialToolsSection />
      <SarathiSection />
      <FinalCtaSection />
    </>
  );
}
