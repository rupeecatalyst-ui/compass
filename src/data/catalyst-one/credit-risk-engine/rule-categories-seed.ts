import type { RuleCategoryConfig } from "@/types/rule-library";

export const DEFAULT_RULE_CATEGORIES: RuleCategoryConfig[] = [
  { id: "financial", label: "Financial", description: "FOIR, DBR, LTV, income and obligation thresholds", enabled: true, sortOrder: 1 },
  { id: "property", label: "Property", description: "Property type, occupancy and valuation rules", enabled: true, sortOrder: 2 },
  { id: "bureau", label: "Bureau", description: "Credit bureau score and report criteria", enabled: true, sortOrder: 3 },
  { id: "banking", label: "Banking", description: "Banking conduct, ABB and statement rules", enabled: true, sortOrder: 4 },
  { id: "customer", label: "Customer", description: "Customer segment, employment and vintage rules", enabled: true, sortOrder: 5 },
  { id: "geography", label: "Geography", description: "City, state and pincode eligibility rules", enabled: true, sortOrder: 6 },
  { id: "custom", label: "Custom", description: "Organization-defined rule categories", enabled: true, sortOrder: 7 },
];
