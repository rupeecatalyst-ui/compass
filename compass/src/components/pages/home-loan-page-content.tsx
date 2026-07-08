"use client";

import { HeroSection } from "@/components/homepage/hero-section";
import { HomeLoanMetricsSection } from "@/components/homepage/home-loan-metrics-section";
import { WhyCompassSection } from "@/components/homepage/why-compass-section";
import { HomeBuyerQuestionsSection } from "@/components/homepage/home-buyer-questions-section";
import { AdvantageConversationSection } from "@/components/homepage/advantage-conversation-section";
import { FinalCtaSection } from "@/components/homepage/final-cta-section";

/**
 * HL-03 order:
 * Hero → Metrics → Confidence/Transparency/Decisions
 * → Questions accordion → Sarathi conversation → Final CTA
 */
export function HomeLoanPageContent() {
  return (
    <>
      <HeroSection />
      <HomeLoanMetricsSection />
      <WhyCompassSection />
      <HomeBuyerQuestionsSection />
      <AdvantageConversationSection />
      <FinalCtaSection />
    </>
  );
}
