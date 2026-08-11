/**
 * CO-AI-G2-W8 — Fixture rows for Product Owner Shadow Mode Dashboard BAT.
 */

import type { EaoShadowDashboardComposeInput } from "@/types/enterprise-ai-orchestrator/shadow-dashboard";

export const EAO_SHADOW_DASHBOARD_FIXTURES: EaoShadowDashboardComposeInput[] = [
  {
    label: "business-loan-timeline",
    customerUtterance: "How fast can I get a business loan?",
    liveFacingText:
      "With complete documents, some business loan cases can move quite quickly, although timelines depend on the lender and your profile. Is your business a proprietorship, partnership, or private limited?",
    modelFacingText:
      "That's a fair question. Timelines and fit depend on your profile and documents — I won't invent numbers, but I can guide what typically matters next.",
    productPath: "business_loan",
    latencyMs: 980,
    consultationScore: 40,
  },
  {
    label: "home-loan-pune",
    customerUtterance: "I want to buy my first home — a ready flat in Pune.",
    liveFacingText:
      "I'd be glad to help with your first home purchase in Pune. Before we go deeper, are you salaried or self-employed?",
    modelFacingText:
      "Thank you for sharing that. To advise accurately, it helps to know which loan type you're exploring and roughly how much funding you need.",
    productPath: "home_loan",
    latencyMs: 1120,
    consultationScore: 55,
  },
  {
    label: "bt-weak-live",
    customerUtterance: "I want a home loan balance transfer to reduce my EMI.",
    liveFacingText: "Let's explore your options. Share whatever feels useful next.",
    modelFacingText:
      "Balance transfer can help when your current rate or EMI is no longer competitive. Which bank is your current home loan with?",
    productPath: "balance_transfer",
    latencyMs: 1450,
    consultationScore: 45,
  },
];
