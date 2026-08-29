"use client";

import { PageAmbientIntelligence } from "@/components/ambient-intelligence/home-loan-ambient";
import { HlBestMatch } from "@/components/home-loan-experience/hl-best-match";
import { HlDocumentsGate } from "@/components/home-loan-experience/hl-documents-gate";
import { HlFinalCta } from "@/components/home-loan-experience/hl-final-cta";
import { HlHero } from "@/components/home-loan-experience/hl-hero";
import { HlIntro } from "@/components/home-loan-experience/hl-intro";
import { HlJourneyTimeline } from "@/components/home-loan-experience/hl-journey-timeline";
import { HlSarathiAdvisory } from "@/components/home-loan-experience/hl-sarathi-advisory";
import { HlTrust } from "@/components/home-loan-experience/hl-trust";

/** Premium Home Loan Product Experience — master template for COMPASS discovery. */
export function HomeLoanExperience() {
  return (
    <div className="bg-[#05070c]">
      <HlHero />
      <HlIntro />
      <HlBestMatch />
      <HlJourneyTimeline />
      <HlTrust />
      <HlFinalCta />
      <HlSarathiAdvisory />
      <HlDocumentsGate />
      <PageAmbientIntelligence />
    </div>
  );
}
