import type { DiscoveryAnswers } from "@/components/home-loan-experience/discovery/discovery-context";
import type { DiscoveryIntelligenceResult } from "@/services/catalyst-one/types";

export async function fetchDiscoveryIntelligence(
  answers: DiscoveryAnswers,
): Promise<DiscoveryIntelligenceResult> {
  const response = await fetch("/api/discovery/intelligence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product: "home-loan",
      answers: {
        propertyType: answers.propertyType,
        loanAmount: answers.loanAmount,
        propertyValue: answers.propertyValue,
        mobile: answers.mobile,
        otpVerified: answers.otpVerified,
        incomeType: answers.incomeType,
        monthlyIncome: answers.monthlyIncome,
        existingEmi: answers.existingEmi,
        city: answers.city,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to load your COMPASS Advantage");
  }

  return response.json() as Promise<DiscoveryIntelligenceResult>;
}
