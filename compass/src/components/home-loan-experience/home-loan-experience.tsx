"use client";

import { AnimatePresence } from "framer-motion";
import { PageAmbientIntelligence } from "@/components/ambient-intelligence/home-loan-ambient";
import { DiscoveryJourney } from "@/components/home-loan-experience/discovery/discovery-journey";
import { DiscoveryLaunchBridge } from "@/components/home-loan-experience/discovery/discovery-launch-bridge";
import { DiscoveryProvider, useDiscovery } from "@/components/home-loan-experience/discovery/discovery-context";
import { HlBestMatch } from "@/components/home-loan-experience/hl-best-match";
import { HlDocumentsGate } from "@/components/home-loan-experience/hl-documents-gate";
import { HlFinalCta } from "@/components/home-loan-experience/hl-final-cta";
import { HlHero } from "@/components/home-loan-experience/hl-hero";
import { HlIntro } from "@/components/home-loan-experience/hl-intro";
import { HlJourneyTimeline } from "@/components/home-loan-experience/hl-journey-timeline";
import { HlSarathiAdvisory } from "@/components/home-loan-experience/hl-sarathi-advisory";
import { HlTrust } from "@/components/home-loan-experience/hl-trust";

function DiscoveryOverlay() {
  const { isOpen, launchKey } = useDiscovery();
  return (
    <AnimatePresence mode="wait">
      {isOpen ? <DiscoveryJourney key={launchKey} /> : null}
    </AnimatePresence>
  );
}

function HomeLoanExperienceInner() {
  return (
    <>
      <DiscoveryLaunchBridge />
      <HlHero />
      <HlIntro />
      <HlBestMatch />
      <HlJourneyTimeline />
      <HlTrust />
      <HlFinalCta />
      <HlSarathiAdvisory />
      <HlDocumentsGate />
      <PageAmbientIntelligence />
      <DiscoveryOverlay />
    </>
  );
}

/** Premium Home Loan Product Experience — master template for COMPASS discovery. */
export function HomeLoanExperience() {
  return (
    <DiscoveryProvider>
      <div className="bg-[#05070c]">
        <HomeLoanExperienceInner />
      </div>
    </DiscoveryProvider>
  );
}
