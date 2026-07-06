import type { FutureRiskEnginePlaceholder } from "@/types/credit-risk-engine";

/** Reserved placeholders — calculations implemented in later sprints. */
export const FUTURE_RISK_ENGINE_PLACEHOLDERS: FutureRiskEnginePlaceholder[] = [
  { id: "foir", name: "FOIR Engine", description: "Fixed Obligation to Income Ratio evaluation", status: "foundation_ready" },
  { id: "dbr", name: "DBR Engine", description: "Debt Burden Ratio assessment", status: "foundation_ready" },
  { id: "ltv", name: "LTV Engine", description: "Loan-to-Value computation for secured products", status: "foundation_ready" },
  { id: "banking", name: "Banking Engine", description: "Banking conduct and statement analysis", status: "planned" },
  { id: "financial_health", name: "Financial Health Engine", description: "Holistic financial health scoring", status: "planned" },
  { id: "risk", name: "Risk Engine", description: "Composite risk scoring and banding", status: "in_design" },
  { id: "eligibility", name: "Eligibility Engine", description: "Lender-product eligibility determination", status: "in_design" },
  { id: "recommendation", name: "Recommendation Engine", description: "Lender and product recommendation", status: "planned" },
  { id: "sarathi", name: "Sarathi Integration", description: "Policy sync with Sarathi distribution layer", status: "planned" },
];
