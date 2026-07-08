"use client";

import { PersonalLoanTheme } from "@/components/personal-loan/personal-loan-theme";
import { PersonalLoanHeroSection } from "@/components/personal-loan/personal-loan-hero-section";
import { PersonalLoanMetricsSection } from "@/components/personal-loan/personal-loan-metrics-section";
import { PersonalLoanWhySection } from "@/components/personal-loan/personal-loan-why-section";
import { PersonalLoanQuestionsSection } from "@/components/personal-loan/personal-loan-questions-section";
import { PersonalLoanConversationSection } from "@/components/personal-loan/personal-loan-conversation-section";
import { PersonalLoanFinalCtaSection } from "@/components/personal-loan/personal-loan-final-cta-section";

export function PersonalLoanPageContent() {
  return (
    <PersonalLoanTheme>
      <PersonalLoanHeroSection />
      <PersonalLoanMetricsSection />
      <PersonalLoanWhySection />
      <PersonalLoanQuestionsSection />
      <PersonalLoanConversationSection />
      <PersonalLoanFinalCtaSection />
    </PersonalLoanTheme>
  );
}

