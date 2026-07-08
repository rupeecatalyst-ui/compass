"use client";

import { PlatformHeroSection } from "@/components/homepage/platform-hero-section";
import { IntelligenceJourneySection } from "@/components/homepage/intelligence-journey-section";
import { BorrowSection } from "@/components/homepage/borrow-section";
import { InvestSection } from "@/components/homepage/invest-section";
import { FinancialFitnessSection } from "@/components/homepage/financial-fitness-section";
import { PositioningSection } from "@/components/homepage/positioning-section";
import { TrustSection } from "@/components/homepage/trust-section";
import { FinalCtaSection as PlatformFinalCta } from "@/components/homepage/platform-final-cta-section";

export function HomePageContent() {
  return (
    <>
      <PlatformHeroSection />
      <IntelligenceJourneySection />
      <BorrowSection />
      <InvestSection />
      <FinancialFitnessSection />
      <PositioningSection />
      <TrustSection />
      <PlatformFinalCta />
    </>
  );
}
