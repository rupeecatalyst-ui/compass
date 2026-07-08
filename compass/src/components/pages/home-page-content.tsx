"use client";

import { HeroSection } from "@/components/homepage/hero-section";
import { SarathiSection } from "@/components/homepage/sarathi-section";
import { IntelligenceJourneySection } from "@/components/homepage/intelligence-journey-section";
import { BorrowSection } from "@/components/homepage/borrow-section";
import { InvestSection } from "@/components/homepage/invest-section";
import { FinancialFitnessSection } from "@/components/homepage/financial-fitness-section";
import { PositioningSection } from "@/components/homepage/positioning-section";
import { TrustSection } from "@/components/homepage/trust-section";
import { FinalCtaSection } from "@/components/homepage/final-cta-section";

export function HomePageContent() {
  return (
    <>
      <HeroSection />
      <SarathiSection />
      <IntelligenceJourneySection />
      <BorrowSection />
      <InvestSection />
      <FinancialFitnessSection />
      <PositioningSection />
      <TrustSection />
      <FinalCtaSection />
    </>
  );
}
