import type { CreditRiskLenderRecord } from "@/types/credit-risk-engine";

/** Demo lender records — Admin Console manages unlimited lenders at runtime. */
export const DEFAULT_CREDIT_RISK_LENDERS: CreditRiskLenderRecord[] = [
  { id: "lender_001", name: "Partner Bank Alpha", code: "PBA", enabled: true, sortOrder: 1 },
  { id: "lender_002", name: "Partner NBFC Beta", code: "PNB", enabled: true, sortOrder: 2 },
  { id: "lender_003", name: "Partner HFC Gamma", code: "PHG", enabled: true, sortOrder: 3 },
  { id: "lender_004", name: "Partner Bank Delta", code: "PBD", enabled: false, sortOrder: 4 },
];
