/**
 * Phase 1 — mock Analyze Deal recommendations only.
 * No eligibility / credit / income engines.
 */

import type { AnalyzeDealInputs, AnalyzeDealResult } from "@/types/analyze-deal";

export function buildMockAnalyzeDealResult(inputs: AnalyzeDealInputs): AnalyzeDealResult {
  const productLabel = inputs.productLabel || "Home Loan";
  const productId = inputs.productId || "home-loan";
  const amountHint = inputs.requestedAmount ? ` · ₹${inputs.requestedAmount}` : "";

  return {
    analyzedAt: new Date().toISOString(),
    overallConfidencePct: 87,
    improvementSuggestions: [
      "Confirm income documentation pack before lender login.",
      "Clarify existing EMI obligations with statements.",
      "Align requested amount with indicative property value band.",
      "Capture relationship manager preference for metro processing windows.",
    ],
    recommendations: [
      {
        lenderId: "hdfc",
        lenderName: "HDFC Bank",
        logoInitials: "HD",
        confidencePct: 92,
        productId,
        productLabel,
        programLabel: "Standard Salaried Programme (placeholder)",
        status: "strong_fit",
        whyThisLender:
          "Placeholder — strong metro coverage and relationship depth for this product segment. Credit Knowledge Framework will replace this narrative.",
        improvements: [
          "Complete KYC originals before pre-login.",
          "Confirm branch preference for file ownership.",
        ],
        rm: {
          name: "Priya Nair",
          designation: "Relationship Manager",
          mobile: "+91 98200 11223",
          email: "priya.nair@hdfc.example",
          photoInitials: "PN",
        },
      },
      {
        lenderId: "sbi",
        lenderName: "State Bank of India",
        logoInitials: "SB",
        confidencePct: 84,
        productId,
        productLabel,
        programLabel: "Home Advantage (placeholder)",
        status: "good_fit",
        whyThisLender:
          "Placeholder — broad branch network and competitive TAT for documented salaried profiles. Policy detail arrives in Credit Knowledge Framework.",
        improvements: [
          "Verify property technical readiness early.",
          "Share approximate CIBIL band with RM before login.",
        ],
        rm: {
          name: "Rahul Deshmukh",
          designation: "Relationship Manager",
          mobile: "+91 98765 44321",
          email: "rahul.deshmukh@sbi.example",
          photoInitials: "RD",
        },
      },
      {
        lenderId: "bajaj",
        lenderName: "Bajaj Housing Finance",
        logoInitials: "BJ",
        confidencePct: 78,
        productId,
        productLabel,
        programLabel: "Flexi Home (placeholder)",
        status: "review",
        whyThisLender: `Placeholder — HFC alternative when bank programmes need a second path${amountHint}. Evaluation only — no eligibility engine in Phase 1.`,
        improvements: [
          "Review special conditions for self-employed categories.",
          "Confirm city coverage for the customer residence.",
        ],
        rm: {
          name: "Ananya Kapoor",
          designation: "Relationship Manager",
          mobile: "+91 97654 88990",
          email: "ananya.kapoor@bajaj.example",
          photoInitials: "AK",
        },
      },
    ],
  };
}
